const DriverAvailability = require("../models/DriverAvailability");
const Assignment = require("../models/Assignment");
const PickupRequest = require("../models/PickupRequest");
const User = require("../models/User");
const Notification = require("../models/Notification");
const notificationService = require("../services/notification");
const asyncHandler = require("../utils/asyncHandler");
const { logActivity } = require("../utils/logger");

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const SHORT_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const pad2 = (n) => String(n).padStart(2, "0");

const getTodayStr = () => {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
};

const getCurrentMonthKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
};

/**
 * Partition a calendar month (year, month 1..12) into Monday-Sunday weeks.
 */
const getMonthWeeks = (year, month) => {
  const todayStr = getTodayStr();
  const daysInMonth = new Date(year, month, 0).getDate();
  const weeks = [];
  let currentDays = [];
  let weekNumber = 1;

  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, month - 1, d);
    const jsDay = dateObj.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
    const dateStr = `${year}-${pad2(month)}-${pad2(d)}`;

    currentDays.push({
      date: dateStr,
      dayOfMonth: d,
      dayOfWeek: DAY_NAMES[jsDay],
      shortDay: SHORT_DAYS[jsDay],
      isPast: dateStr < todayStr,
      isToday: dateStr === todayStr,
    });

    // End week on Sunday (jsDay === 0) or last day of the month
    if (jsDay === 0 || d === daysInMonth) {
      const weekStart = currentDays[0].date;
      const weekEnd = currentDays[currentDays.length - 1].date;
      const isPastWeek = currentDays.every((dayItem) => dayItem.isPast);
      const isCurrentWeek =
        todayStr >= weekStart && todayStr <= weekEnd;

      weeks.push({
        weekNumber,
        weekStart,
        weekEnd,
        isPastWeek,
        isCurrentWeek,
        days: currentDays,
      });

      weekNumber++;
      currentDays = [];
    }
  }

  return weeks;
};

const normalizeStr = (s) => (s || "").trim().replace(/\s+/g, " ").toLowerCase();

const escapeRegex = (s) =>
  (s || "")
    .trim()
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\s+/g, "\\s+");

/**
 * Extract LGA, Ward, and Polling Units from an Assignment document.
 */
const extractAssignmentCoverage = (assignment) => {
  const lgas = new Set();
  const wards = new Set();
  const pollingUnits = new Set();

  if (assignment.lga && assignment.lga.trim()) {
    lgas.add(assignment.lga.trim());
  }
  if (assignment.ward && assignment.ward.trim()) {
    wards.add(assignment.ward.trim());
  }
  if (Array.isArray(assignment.pollingUnits)) {
    assignment.pollingUnits.forEach((pu) => {
      if (pu && pu.trim()) pollingUnits.add(pu.trim());
    });
  }

  if (assignment.area && assignment.area.includes(" - ")) {
    const [areaLga, areaWard] = assignment.area.split(" - ").map((s) => s.trim());
    if (areaLga) lgas.add(areaLga);
    if (areaWard) wards.add(areaWard);
  }

  if (Array.isArray(assignment.stops)) {
    for (const s of assignment.stops) {
      if (s.lga && s.lga.trim()) lgas.add(s.lga.trim());
      if (s.ward && s.ward.trim()) wards.add(s.ward.trim());
      if (s.pollingUnit && s.pollingUnit.trim()) {
        pollingUnits.add(s.pollingUnit.trim());
      }
    }
  }

  return {
    lgas: [...lgas],
    wards: [...wards],
    pollingUnits: [...pollingUnits],
  };
};

/**
 * Get all LGAs, Wards, and Polling Units assigned to a driver from their assignments.
 */
const getDriverCoverage = async (driverId) => {
  const assignments = await Assignment.find({ driverId })
    .sort({ collectionDate: -1 })
    .lean();

  // Prioritize active/upcoming assignments if any exist, but include all assigned areas
  const lgas = new Set();
  const wards = new Set();
  const pollingUnits = new Set();

  for (const a of assignments) {
    const cov = extractAssignmentCoverage(a);
    cov.lgas.forEach((l) => lgas.add(l));
    cov.wards.forEach((w) => wards.add(w));
    cov.pollingUnits.forEach((p) => pollingUnits.add(p));
  }

  return {
    localGovts: [...lgas],
    wards: [...wards],
    pollingUnits: [...pollingUnits],
    assignmentsCount: assignments.length,
  };
};

/**
 * Find drivers assigned to a specific Local Govt and Polling Unit.
 */
const findAssignedDriversForArea = async (localGovt, pollingUnit) => {
  if (!pollingUnit || !pollingUnit.trim()) {
    return [];
  }

  const normPu = normalizeStr(pollingUnit);
  const normLga = normalizeStr(localGovt);

  const assignments = await Assignment.find()
    .populate("driverId", "_id name email phone truckPlateNumber truckCapacity isDeactivated")
    .sort({ collectionDate: -1 })
    .lean();

  // First check active assignments (Pending, InProgress, Paused), then fallback to Completed
  const activeDriverMap = new Map();
  const fallbackDriverMap = new Map();

  for (const a of assignments) {
    if (!a.driverId || a.driverId.isDeactivated) continue;
    const cov = extractAssignmentCoverage(a);

    const hasPu = cov.pollingUnits.some((pu) => normalizeStr(pu) === normPu);
    if (!hasPu) continue;

    // Match LGA if resident has localGovt and assignment has LGA info
    const hasLga =
      !normLga ||
      cov.lgas.length === 0 ||
      cov.lgas.some((l) => normalizeStr(l) === normLga);
    if (!hasLga) continue;

    const dId = String(a.driverId._id);
    if (["Pending", "InProgress", "Paused"].includes(a.status)) {
      if (!activeDriverMap.has(dId)) {
        activeDriverMap.set(dId, a.driverId);
      }
    } else {
      if (!fallbackDriverMap.has(dId)) {
        fallbackDriverMap.set(dId, a.driverId);
      }
    }
  }

  if (activeDriverMap.size > 0) {
    return [...activeDriverMap.values()];
  }
  return [...fallbackDriverMap.values()];
};

/**
 * Get available pickup dates for a resident based on the driver(s) assigned
 * to their Local Govt & Polling Unit.
 */
const getAvailableSlotsForResidentData = async (user) => {
  const localGovt = user.localGovt || "";
  const ward = user.ward || "";
  const pollingUnit = user.pollingUnit || "";

  if (!pollingUnit) {
    return {
      assignedDrivers: [],
      availableSlots: [],
      availableDates: [],
      residentArea: { localGovt, ward, pollingUnit },
      message:
        "Your profile does not have a Polling Unit set. Please update your profile.",
    };
  }

  const drivers = await findAssignedDriversForArea(localGovt, pollingUnit);
  if (drivers.length === 0) {
    return {
      assignedDrivers: [],
      availableSlots: [],
      availableDates: [],
      residentArea: { localGovt, ward, pollingUnit },
      message: `No collector has been assigned to your Polling Unit (${pollingUnit}, ${localGovt || "Akure"}) yet.`,
    };
  }

  const todayStr = getTodayStr();
  const currentMonthKey = getCurrentMonthKey();
  const driverIds = drivers.map((d) => d._id);

  // Only availability approved by an admin is visible to residents
  const availabilities = await DriverAvailability.find({
    driverId: { $in: driverIds },
    monthKey: { $gte: currentMonthKey },
    status: "approved",
  })
    .populate("driverId", "_id name phone email truckPlateNumber")
    .sort({ monthKey: 1 })
    .lean();

  const slotsMap = new Map();
  for (const avail of availabilities) {
    const drv = avail.driverId;
    for (const slot of avail.slots || []) {
      if (slot.date >= todayStr) {
        const key = `${slot.date}_${drv._id}`;
        if (!slotsMap.has(key)) {
          slotsMap.set(key, {
            date: slot.date,
            dayOfWeek: slot.dayOfWeek,
            weekNumber: slot.weekNumber,
            weekStart: slot.weekStart,
            weekEnd: slot.weekEnd,
            timeSlot: slot.timeSlot || "08:00 AM",
            driverId: String(drv._id),
            driverName: drv.name,
            driverPhone: drv.phone,
            monthKey: avail.monthKey,
          });
        }
      }
    }
  }

  const availableSlots = [...slotsMap.values()].sort((a, b) =>
    a.date.localeCompare(b.date)
  );
  const availableDates = [...new Set(availableSlots.map((s) => s.date))];

  // Count how many pickups are already booked on these dates in this polling unit
  const existingPickups = await PickupRequest.find({
    scheduledDate: { $in: availableDates },
    status: { $nin: ["cancelled", "rejected"] },
    pollingUnit: new RegExp(`^${escapeRegex(pollingUnit)}$`, "i"),
  })
    .select("scheduledDate")
    .lean();

  const countByDate = {};
  for (const p of existingPickups) {
    countByDate[p.scheduledDate] = (countByDate[p.scheduledDate] || 0) + 1;
  }

  const enrichedSlots = availableSlots.map((s) => ({
    ...s,
    bookedResidentsCount: countByDate[s.date] || 0,
  }));

  return {
    assignedDrivers: drivers.map((d) => ({
      id: String(d._id),
      name: d.name,
      phone: d.phone,
      email: d.email,
      truckPlateNumber: d.truckPlateNumber,
    })),
    availableSlots: enrichedSlots,
    availableDates,
    residentArea: { localGovt, ward, pollingUnit },
    message:
      enrichedSlots.length === 0
        ? "Your assigned collector has no approved pickup days for the rest of this month yet. Please check back once the admin approves their schedule."
        : null,
  };
};

/**
 * @desc    Driver gets their own monthly availability & week breakdown
 * @route   GET /api/availability/me?monthKey=YYYY-MM
 * @access  Private (Driver)
 */
exports.getMyAvailability = asyncHandler(async (req, res) => {
  const monthKey = req.query.monthKey || getCurrentMonthKey();
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!match) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid monthKey format. Expected YYYY-MM." });
  }

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);

  const [availability, coverage] = await Promise.all([
    DriverAvailability.findOne({ driverId: req.user._id, monthKey }).lean(),
    getDriverCoverage(req.user._id),
  ]);

  const weeks = getMonthWeeks(year, month);

  // Also count how many resident pickup requests are scheduled for this driver's area on each date
  const selectedDates = availability?.availableDates || [];
  let pickupCountsByDate = {};
  if (selectedDates.length > 0 && coverage.pollingUnits.length > 0) {
    const puRegexes = coverage.pollingUnits.map(
      (pu) => new RegExp(`^${escapeRegex(pu)}$`, "i")
    );
    const pickups = await PickupRequest.find({
      scheduledDate: { $in: selectedDates },
      pollingUnit: { $in: puRegexes },
      status: { $nin: ["cancelled", "rejected"] },
    })
      .select("scheduledDate status")
      .lean();

    for (const p of pickups) {
      pickupCountsByDate[p.scheduledDate] =
        (pickupCountsByDate[p.scheduledDate] || 0) + 1;
    }
  }

  res.json({
    success: true,
    data: {
      monthKey,
      year,
      month,
      weeks,
      coverage,
      availability: availability
        ? {
            ...availability,
            status: availability.status || "pending",
            rejectionReason: availability.rejectionReason || null,
          }
        : {
            driverId: req.user._id,
            year,
            month,
            monthKey,
            slots: [],
            availableDates: [],
            notes: "",
            status: "pending",
            rejectionReason: null,
          },
      isLocked: availability?.status === "approved",
      pickupCountsByDate,
    },
  });
});

/**
 * @desc    Driver creates or updates their 1-day-per-week monthly availability
 * @route   POST /api/availability
 * @access  Private (Driver)
 */
exports.saveMyAvailability = asyncHandler(async (req, res) => {
  const { monthKey: rawMonthKey, dates, timeSlot, notes } = req.body;
  const monthKey = rawMonthKey || getCurrentMonthKey();

  const match = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!match) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid monthKey format. Expected YYYY-MM." });
  }

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const weeks = getMonthWeeks(year, month);

  if (!Array.isArray(dates) || dates.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Please select one available day per week for the month.",
    });
  }

  const uniqueDates = [...new Set(dates.map((d) => String(d).trim()))].sort();

  // Map each date to its week in the month and enforce strictly 1 day per week
  const slots = [];
  const usedWeeks = new Set();

  for (const dateStr of uniqueDates) {
    const foundWeek = weeks.find((w) =>
      w.days.some((d) => d.date === dateStr)
    );
    if (!foundWeek) {
      return res.status(400).json({
        success: false,
        message: `Date ${dateStr} does not belong to ${monthKey}.`,
      });
    }

    if (usedWeeks.has(foundWeek.weekNumber)) {
      return res.status(400).json({
        success: false,
        message: `You can only select one day per week (conflict in Week ${foundWeek.weekNumber}: ${foundWeek.weekStart} to ${foundWeek.weekEnd}).`,
      });
    }

    usedWeeks.add(foundWeek.weekNumber);
    const dayObj = foundWeek.days.find((d) => d.date === dateStr);

    slots.push({
      weekNumber: foundWeek.weekNumber,
      weekStart: foundWeek.weekStart,
      weekEnd: foundWeek.weekEnd,
      date: dateStr,
      dayOfWeek: dayObj.dayOfWeek,
      timeSlot: timeSlot || "08:00 AM",
    });
  }

  slots.sort((a, b) => a.weekNumber - b.weekNumber);
  const availableDates = slots.map((s) => s.date);

  const saved = await DriverAvailability.findOneAndUpdate(
    { driverId: req.user._id, monthKey, status: { $ne: "approved" } },
    {
      $set: {
        driverId: req.user._id,
        year,
        month,
        monthKey,
        slots,
        availableDates,
        notes: notes || "",
        status: "pending",
        approvedBy: null,
        approvedAt: null,
        rejectionReason: null,
        rejectedBy: null,
        rejectedAt: null,
      },
    },
    { upsert: true, new: true, runValidators: true }
  ).catch((err) => {
    // Unique (driverId, monthKey) index collision => record was approved in the meantime
    if (err && err.code === 11000) return null;
    throw err;
  });

  if (!saved) {
    return res.status(403).json({
      success: false,
      message:
        "Your availability for this month has already been approved by the admin and can no longer be changed.",
    });
  }

  await logActivity(
    req.user._id,
    "Set Pickup Availability",
    `Submitted monthly pickup availability for ${monthKey} (awaiting approval): ${availableDates.join(", ")}`
  );

  res.json({
    success: true,
    message: "Availability submitted. It will be visible to residents once the admin approves it.",
    data: saved,
  });
});

/**
 * @desc    Admin approves a driver's monthly availability (locks it & publishes to residents)
 * @route   PATCH /api/availability/admin/:id/approve
 * @access  Private (Admin)
 */
exports.approveAvailability = asyncHandler(async (req, res) => {
  const availability = await DriverAvailability.findById(req.params.id);
  if (!availability) {
    return res
      .status(404)
      .json({ success: false, message: "Availability record not found" });
  }

  if (availability.status === "approved") {
    return res.status(400).json({
      success: false,
      message: "This availability has already been approved.",
    });
  }

  if (!availability.slots || availability.slots.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Cannot approve an availability with no selected days.",
    });
  }

  availability.status = "approved";
  availability.approvedBy = req.user._id;
  availability.approvedAt = new Date();
  await availability.save();

  const driver = await User.findById(availability.driverId).select(
    "name expoPushToken"
  );
  if (driver) {
    const msg = `Your pickup availability for ${availability.monthKey} has been approved. Residents in your area can now book those days. It can no longer be changed.`;
    await Notification.create({
      userId: driver._id,
      title: "Availability Approved",
      message: msg,
      type: "StatusUpdate",
    });
    if (driver.expoPushToken) {
      try {
        await notificationService.sendPushNotification(
          driver.expoPushToken,
          "Availability Approved",
          msg
        );
      } catch (e) {
        console.error("Failed to push availability approval:", e.message);
      }
    }
  }

  await logActivity(
    req.user._id,
    "Approve Availability",
    `Approved ${driver?.name || "driver"}'s pickup availability for ${availability.monthKey}`
  );

  res.json({
    success: true,
    message: "Availability approved",
    data: availability,
  });
});

/**
 * @desc    Admin rejects a driver's monthly availability with a reason
 * @route   PATCH /api/availability/admin/:id/reject
 * @access  Private (Admin)
 */
exports.rejectAvailability = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  if (!reason || !reason.trim()) {
    return res.status(400).json({
      success: false,
      message: "Please state a reason for rejecting the availability.",
    });
  }

  const availability = await DriverAvailability.findById(req.params.id);
  if (!availability) {
    return res
      .status(404)
      .json({ success: false, message: "Availability record not found" });
  }

  availability.status = "rejected";
  availability.rejectionReason = reason.trim();
  availability.rejectedBy = req.user._id;
  availability.rejectedAt = new Date();
  availability.approvedBy = null;
  availability.approvedAt = null;
  await availability.save();

  const driver = await User.findById(availability.driverId).select(
    "name expoPushToken"
  );
  if (driver) {
    const msg = `Your pickup availability for ${availability.monthKey} was rejected by Admin. Reason: "${reason.trim()}". You can update your schedule and resubmit.`;
    await Notification.create({
      userId: driver._id,
      title: "Availability Rejected",
      message: msg,
      type: "StatusUpdate",
    });
    if (driver.expoPushToken) {
      try {
        await notificationService.sendPushNotification(
          driver.expoPushToken,
          "Availability Rejected",
          msg
        );
      } catch (e) {
        console.error("Failed to push availability rejection:", e.message);
      }
    }
  }

  await logActivity(
    req.user._id,
    "Reject Availability",
    `Rejected ${driver?.name || "driver"}'s pickup availability for ${availability.monthKey}. Reason: ${reason.trim()}`
  );

  res.json({
    success: true,
    message: "Availability rejected",
    data: availability,
  });
});

/**
 * @desc    Resident gets available pickup days for the driver assigned to their Polling Unit & LGA
 * @route   GET /api/availability/resident
 * @access  Private (Resident)
 */
exports.getResidentAvailableDates = asyncHandler(async (req, res) => {
  const result = await getAvailableSlotsForResidentData(req.user);
  res.json({
    success: true,
    data: result,
  });
});

/**
 * @desc    Admin gets all drivers and their monthly availability schedules
 * @route   GET /api/availability/admin?monthKey=YYYY-MM
 * @access  Private (Admin)
 */
exports.getAllDriversAvailability = asyncHandler(async (req, res) => {
  const monthKey = req.query.monthKey || getCurrentMonthKey();
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!match) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid monthKey format. Expected YYYY-MM." });
  }

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const weeks = getMonthWeeks(year, month);

  const [drivers, availabilities, assignments, monthPickups] = await Promise.all([
    User.find({ role: "driver", isDeleted: { $ne: true } })
      .select("_id name email phone truckPlateNumber truckCapacity isDeactivated address localGovt ward pollingUnit")
      .sort({ name: 1 })
      .lean(),
    DriverAvailability.find({ monthKey }).lean(),
    Assignment.find().sort({ collectionDate: -1 }).lean(),
    PickupRequest.find({
      scheduledDate: { $regex: `^${monthKey}` },
      status: { $nin: ["cancelled"] },
    })
      .populate("userId", "name phone address localGovt ward pollingUnit")
      .lean(),
  ]);

  const availByDriver = new Map();
  for (const a of availabilities) {
    availByDriver.set(String(a.driverId), a);
  }

  // Group assignments by driverId
  const assignmentsByDriver = new Map();
  for (const a of assignments) {
    const dId = String(a.driverId);
    if (!assignmentsByDriver.has(dId)) {
      assignmentsByDriver.set(dId, []);
    }
    assignmentsByDriver.get(dId).push(a);
  }

  const items = drivers.map((drv) => {
    const dId = String(drv._id);
    const drvAssignments = assignmentsByDriver.get(dId) || [];
    const lgas = new Set();
    const wards = new Set();
    const pollingUnits = new Set();

    for (const a of drvAssignments) {
      const cov = extractAssignmentCoverage(a);
      cov.lgas.forEach((l) => lgas.add(l));
      cov.wards.forEach((w) => wards.add(w));
      cov.pollingUnits.forEach((p) => pollingUnits.add(p));
    }

    const puNormSet = new Set([...pollingUnits].map((p) => normalizeStr(p)));
    const lgaNormSet = new Set([...lgas].map((l) => normalizeStr(l)));

    const avail = availByDriver.get(dId) || null;
    const slots = (avail?.slots || []).map((slot) => {
      // Find pickups matching this date and this driver (or this driver's assigned polling units)
      const matchingPickups = monthPickups.filter((p) => {
        if (p.scheduledDate !== slot.date) return false;
        if (p.driverId && String(p.driverId) === dId) return true;
        const pPu = normalizeStr(p.pollingUnit);
        const pLga = normalizeStr(p.localGovt);
        const puMatch = pPu && puNormSet.has(pPu);
        const lgaMatch = !pLga || lgaNormSet.size === 0 || lgaNormSet.has(pLga);
        return puMatch && lgaMatch;
      });

      return {
        ...slot,
        pickupsCount: matchingPickups.length,
        pickups: matchingPickups.map((p) => ({
          id: String(p._id),
          residentName: p.userId?.name || "Resident",
          residentPhone: p.userId?.phone || "",
          address: p.address || p.userId?.address || "",
          pollingUnit: p.pollingUnit || p.userId?.pollingUnit || "",
          localGovt: p.localGovt || p.userId?.localGovt || "",
          type: p.type,
          status: p.status,
          extraFee: p.extraFee,
        })),
      };
    });

    const totalPickupsThisMonth = slots.reduce(
      (sum, s) => sum + (s.pickupsCount || 0),
      0
    );

    return {
      driver: {
        id: dId,
        _id: dId,
        name: drv.name,
        email: drv.email,
        phone: drv.phone,
        truckPlateNumber: drv.truckPlateNumber || "AKR-TRUCK",
        truckCapacity: drv.truckCapacity || "N/A",
        address: drv.address || "",
        localGovt: drv.localGovt || "",
        ward: drv.ward || "",
        pollingUnit: drv.pollingUnit || "",
        isDeactivated: !!drv.isDeactivated,
      },
      coverage: {
        localGovts: [...lgas],
        wards: [...wards],
        pollingUnits: [...pollingUnits],
        assignmentsCount: drvAssignments.length,
      },
      hasAvailability: slots.length > 0,
      availabilityId: avail ? String(avail._id) : null,
      approvalStatus: avail ? avail.status || "pending" : null,
      approvedAt: avail?.approvedAt || null,
      rejectionReason: avail?.rejectionReason || null,
      rejectedAt: avail?.rejectedAt || null,
      monthKey,
      slots,
      availableDates: avail?.availableDates || [],
      notes: avail?.notes || "",
      updatedAt: avail?.updatedAt || null,
      totalPickupsThisMonth,
    };
  });

  const driversWithAvailability = items.filter((i) => i.hasAvailability).length;
  const totalScheduledDays = items.reduce((acc, i) => acc + i.slots.length, 0);
  const awaitingApproval = items.filter(
    (i) => i.hasAvailability && i.approvalStatus === "pending"
  ).length;
  const approvedCount = items.filter((i) => i.approvalStatus === "approved").length;
  const rejectedCount = items.filter((i) => i.approvalStatus === "rejected").length;

  res.json({
    success: true,
    data: {
      monthKey,
      year,
      month,
      weeks,
      summary: {
        totalDrivers: drivers.length,
        driversWithAvailability,
        driversPendingAvailability: drivers.length - driversWithAvailability,
        awaitingApproval,
        approvedCount,
        rejectedCount,
        totalScheduledDays,
      },
      drivers: items,
    },
  });
});

exports.getDriverCoverage = getDriverCoverage;
exports.findAssignedDriversForArea = findAssignedDriversForArea;
exports.getAvailableSlotsForResidentData = getAvailableSlotsForResidentData;
exports.extractAssignmentCoverage = extractAssignmentCoverage;
exports.normalizeStr = normalizeStr;
exports.escapeRegex = escapeRegex;
exports.getTodayStr = getTodayStr;
