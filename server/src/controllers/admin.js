const User = require("../models/User");
const PickupRequest = require("../models/PickupRequest");
const Assignment = require("../models/Assignment");
const Schedule = require("../models/Schedule");
const CollectionLog = require("../models/CollectionLog");
const ActivityLog = require("../models/ActivityLog");
const Bill = require("../models/Bill");
const asyncHandler = require("../utils/asyncHandler");
const { logActivity } = require("../utils/logger");
const {
  getLatestDriverLocations,
  isDriverConnected,
} = require("../websocket/trackingServer");
const {
  calculateMonthlyTariff,
  calculateOutstanding,
} = require("../utils/billing");

exports.getAllLogs = asyncHandler(async (req, res) => {
  const rawLogs = await ActivityLog.find()
    .populate("user", "name email role phone")
    .sort({ createdAt: -1 })
    .lean();

  const formattedLogs = rawLogs.map((log) => {
    const actorUser = log.user
      ? {
          id: String(log.user._id ?? log.user.id),
          _id: String(log.user._id ?? log.user.id),
          name: log.user.name || "User",
          email: log.user.email || "N/A",
          role: log.user.role || "user",
          phone: log.user.phone || "",
        }
      : {
          id: "system",
          _id: "system",
          name: "System / Automation",
          email: "system@smartenv.gov.ng",
          role: "system",
          phone: "",
        };

    const originIp =
      log.ipAddress ||
      log.details?.ipAddress ||
      log.details?.ip ||
      "127.0.0.1";

    return {
      id: String(log._id),
      _id: String(log._id),
      action: log.action || "System Event",
      description: log.description || log.action || "Activity recorded",
      timestamp: log.createdAt ? new Date(log.createdAt).toISOString() : new Date().toISOString(),
      createdAt: log.createdAt ? new Date(log.createdAt).toISOString() : new Date().toISOString(),
      ipAddress: originIp,
      user: actorUser,
      userId: actorUser,
      details: log.details || {},
    };
  });

  res.json({
    success: true,
    data: formattedLogs,
  });
});

exports.getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select("-password").sort({ createdAt: -1 });

  res.json({
    success: true,
    data: users,
  });
});

/**
 * @desc    Get aggregated dashboard statistics
 * @route   GET /api/admin/stats
 * @access  Private (admin)
 */
exports.getDashboardStats = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  // Build date filter (default: last 30 days / 1 month)
  let dateFilter = {};
  let start = null;
  let end = null;

  if (startDate !== "all") {
    start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    end = endDate ? new Date(endDate) : new Date();

    if (startDate && startDate.length <= 10) {
      start.setHours(0, 0, 0, 0);
    }
    if (endDate && endDate.length <= 10) {
      end.setHours(23, 59, 59, 999);
    }

    dateFilter = {
      createdAt: { $gte: start, $lte: end },
    };
  }

  const [
    totalResidents,
    totalDrivers,
    activeDrivers,
    paidBills,
    assignments,
    pickupRequests,
    activeSchedules,
  ] = await Promise.all([
    User.countDocuments({ role: "resident" }),
    User.countDocuments({ role: "driver" }),
    User.countDocuments({ role: "driver", isDeactivated: { $ne: true } }),
    Bill.find({
      status: { $regex: /^paid$/i },
      ...(dateFilter.createdAt ? { createdAt: dateFilter.createdAt } : {}),
    }).lean(),
    Assignment.find(dateFilter).lean(),
    PickupRequest.find(dateFilter).lean(),
    Schedule.countDocuments(),
  ]);

  const totalRevenue = paidBills.reduce((acc, b) => acc + (Number(b.amount) || 0), 0);
  const totalPayments = paidBills.length;

  // Route Collections (House-to-House from Admin Tasks)
  let totalHouses = 0;
  let completedHouses = 0;
  let skippedHouses = 0;
  let pendingHouses = 0;
  let activeRoutes = 0;
  let pendingVerifications = 0;
  let disputedPickups = 0;

  for (const a of assignments) {
    if (["InProgress", "in_progress", "Pending", "planned"].includes(a.status)) {
      activeRoutes++;
    }
    const stops = a.stops || [];
    for (const s of stops) {
      totalHouses++;
      const sStatus = (s.status || "").toLowerCase();
      if (sStatus === "completed") {
        completedHouses++;
      } else if (sStatus === "skipped") {
        skippedHouses++;
      } else {
        pendingHouses++;
      }

      if (
        ["AwaitingResident", "ResidentConfirmed"].includes(s.verificationStatus) ||
        s.readyForAdminReview
      ) {
        pendingVerifications++;
      } else if (s.verificationStatus === "Disputed") {
        pendingVerifications++;
        disputedPickups++;
      }
    }
  }

  // Resident Pickup Requests
  let totalPickups = 0;
  let completedPickups = 0;
  let pendingPickups = 0;
  let rejectedPickups = 0;
  let cancelledPickups = 0;

  for (const p of pickupRequests) {
    totalPickups++;
    const pStatus = (p.status || "").toLowerCase();
    if (pStatus === "completed" || pStatus === "collected") {
      completedPickups++;
    } else if (pStatus === "rejected") {
      rejectedPickups++;
    } else if (pStatus === "cancelled") {
      cancelledPickups++;
    } else {
      pendingPickups++;
    }

    if (["AwaitingResident", "ResidentConfirmed", "Disputed"].includes(p.verificationStatus)) {
      pendingVerifications++;
      if (p.verificationStatus === "Disputed") disputedPickups++;
    }
  }

  const collectionsBreakdown = {
    totalHouses,
    completedHouses,
    pendingHouses,
    skippedHouses,
  };

  const pickupsBreakdown = {
    totalPickups,
    completedPickups,
    pendingPickups,
    rejectedPickups,
    cancelledPickups,
  };

  res.json({
    success: true,
    data: {
      dateRange: {
        startDate: start ? start.toISOString() : null,
        endDate: end ? end.toISOString() : null,
      },
      totalResidents,
      totalDrivers,
      totalCollectors: activeDrivers || totalDrivers,
      activeRoutes,
      collectionsBreakdown,
      pickupsBreakdown,
      totalPickups,
      completedPickups,
      pendingPickups,
      rejectedPickups,
      pendingVerifications,
      unverifiedPickups: pendingVerifications,
      totalPayments,
      totalRevenue,
      activeSchedules,
    },
  });
});

/**
 * @desc    Get all residents
 * @route   GET /api/admin/residents
 * @access  Private (admin)
 */
exports.getAllResidents = asyncHandler(async (req, res) => {
  const { search } = req.query;
  const filter = { role: "resident" };

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
    ];
  }

  const residents = await User.find(filter)
    .select("-password")
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    data: residents,
  });
});

/**
 * @desc    Get all payments (paid bills)
 * @route   GET /api/admin/payments
 * @access  Private (admin)
 */
exports.getAllPayments = asyncHandler(async (req, res) => {
  const payments = await Bill.find({ status: "paid" })
    .populate("userId", "name email phone")
    .sort({ updatedAt: -1 });

  res.json({
    success: true,
    data: payments,
  });
});

/**
 * @desc    Get all drivers, with optional email search
 * @route   GET /api/admin/drivers?email=...
 * @access  Private (admin)
 */
exports.getDrivers = asyncHandler(async (req, res) => {
  const { search, email } = req.query;
  const filter = { role: "driver" };

  if (email) {
    filter.email = { $regex: email, $options: "i" };
  }

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
      { truckPlateNumber: { $regex: search, $options: "i" } },
    ];
  }

  const drivers = await User.find(filter).select("-password").sort({ name: 1 });

  res.json({ success: true, data: drivers });
});

/**
 * @desc    Update driver activation status
 * @route   PATCH /api/admin/drivers/:id/status
 * @access  Private (admin)
 */
exports.updateDriverStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isDeactivated, deactivationReason } = req.body;

  if (!deactivationReason) {
    return res.status(400).json({
      success: false,
      message: `${isDeactivated ? "Deactivation" : "Activation"} reason is required`,
    });
  }

  const driver = await User.findOneAndUpdate(
    { _id: id, role: "driver" },
    {
      $set: {
        isDeactivated,
        deactivationReason: deactivationReason,
      },
    },
    { returnDocument: "after" },
  ).select("-password");

  if (!driver) {
    return res
      .status(404)
      .json({ success: false, message: "Driver not found" });
  }

  await logActivity(
    req.user._id,
    isDeactivated ? "Deactivate Driver" : "Activate Driver",
    `${isDeactivated ? "Deactivated" : "Activated"} driver ${driver.email} for reason: ${deactivationReason}`,
  );

  res.json({
    success: true,
    message: `Driver ${isDeactivated ? "deactivated" : "activated"} successfully`,
    data: driver,
  });
});

/**
 * @desc    Get live driver locations from tracking server memory & active assignments
 * @route   GET /api/admin/tracking/drivers
 * @access  Private (admin)
 */
exports.getLiveDrivers = asyncHandler(async (req, res) => {
  const liveDrivers = getLatestDriverLocations();
  const driverMap = new Map();

  for (const d of liveDrivers) {
    const isOnline = isDriverConnected ? isDriverConnected(d.driverId) : Boolean(d.isOnline);
    driverMap.set(d.driverId, {
      ...d,
      isOnline,
    });
  }

  // Also query active or planned task assignments from database
  try {
    const activeAssignments = await Assignment.find({
      status: { $in: ["InProgress", "Pending", "Paused", "in_progress", "planned"] },
    })
      .populate("driverId", "_id name phone vehiclePlate truckPlateNumber location")
      .sort({ updatedAt: -1 });

    for (const assign of activeAssignments) {
      if (!assign.driverId) continue;
      const did = assign.driverId._id.toString();

      if (!driverMap.has(did)) {
        let lat = 7.2571;
        let lng = 5.2058;

        if (
          assign.stops &&
          assign.stops.length > 0 &&
          assign.stops[0].location?.coordinates?.length === 2
        ) {
          lng = assign.stops[0].location.coordinates[0];
          lat = assign.stops[0].location.coordinates[1];
        } else if (assign.driverId.location?.coordinates?.length === 2) {
          lng = assign.driverId.location.coordinates[0];
          lat = assign.driverId.location.coordinates[1];
        }

        const isOnline = isDriverConnected ? isDriverConnected(did) : false;

        driverMap.set(did, {
          driverId: did,
          driverName: assign.driverId.name,
          phone: assign.driverId.phone || "",
          truckPlate:
            assign.driverId.vehiclePlate ||
            assign.driverId.truckPlateNumber ||
            "AKR-TRUCK",
          taskId: assign._id.toString(),
          latitude: lat,
          longitude: lng,
          speed: 0,
          heading: 0,
          timestamp: Date.now(),
          updatedAt: assign.updatedAt
            ? assign.updatedAt.toISOString()
            : new Date().toISOString(),
          isOnline,
        });
      }
    }

    // Also include any registered driver who is active in the fleet
    const allDrivers = await User.find({
      role: "driver",
      isDeactivated: { $ne: true },
    }).select("_id name phone vehiclePlate truckPlateNumber location updatedAt");

    for (const drv of allDrivers) {
      const did = drv._id.toString();
      if (!driverMap.has(did)) {
        let lat = 7.2571;
        let lng = 5.2058;
        if (drv.location?.coordinates?.length === 2) {
          lng = drv.location.coordinates[0];
          lat = drv.location.coordinates[1];
        }

        const isOnline = isDriverConnected ? isDriverConnected(did) : false;

        driverMap.set(did, {
          driverId: did,
          driverName: drv.name,
          phone: drv.phone || "",
          truckPlate:
            drv.vehiclePlate || drv.truckPlateNumber || "AKR-TRUCK",
          taskId: null,
          latitude: lat,
          longitude: lng,
          speed: 0,
          heading: 0,
          timestamp: Date.now(),
          updatedAt: drv.updatedAt
            ? drv.updatedAt.toISOString()
            : new Date().toISOString(),
          isOnline,
        });
      }
    }
  } catch (err) {
    console.error("[getLiveDrivers] Error fetching active assignments:", err.message);
  }

  res.json({
    success: true,
    data: Array.from(driverMap.values()),
  });
});

/**
 * @desc    Get all residents with billing calculation, arrears, and payment summary
 * @route   GET /api/admin/billing/residents
 * @access  Private (admin)
 */
exports.getResidentsBillingSummary = asyncHandler(async (req, res) => {
  const { search, filter } = req.query;
  const userFilter = { role: "resident" };

  if (search) {
    userFilter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
      { pollingUnit: { $regex: search, $options: "i" } },
      { address: { $regex: search, $options: "i" } },
    ];
  }

  const residents = await User.find(userFilter)
    .select("-password")
    .sort({ createdAt: -1 });

  const residentIds = residents.map((r) => r._id);

  // Fetch all bills for these residents in one query
  const allBills = await Bill.find({ userId: { $in: residentIds } }).sort({
    paidAt: -1,
    createdAt: -1,
  });

  // Group bills by userId
  const billsByUser = new Map();
  for (const bill of allBills) {
    const uid = bill.userId.toString();
    if (!billsByUser.has(uid)) {
      billsByUser.set(uid, []);
    }
    billsByUser.get(uid).push(bill);
  }

  let summaries = residents.map((user) => {
    const userBills = billsByUser.get(user._id.toString()) || [];
    const paidBills = userBills.filter((b) => b.status === "paid");
    const lastPaidBill = paidBills.length > 0 ? paidBills[0] : null;

    const { monthlyRate, outstandingMonths, outstandingAmount } =
      calculateOutstanding(user, lastPaidBill);
    const totalPaid = paidBills.reduce((acc, b) => acc + (b.amount || 0), 0);

    return {
      resident: user,
      monthlyTariff: monthlyRate,
      lastPaymentDate: lastPaidBill ? lastPaidBill.paidAt : null,
      lastPaymentReference: lastPaidBill ? lastPaidBill.paystackReference : null,
      totalPaid,
      outstandingMonths,
      outstandingAmount,
      totalBillsCount: userBills.length,
      paidBillsCount: paidBills.length,
      unpaidBillsCount: userBills.length - paidBills.length,
      status: outstandingAmount > 0 ? "in_arrears" : "up_to_date",
    };
  });

  if (filter === "in_arrears") {
    summaries = summaries.filter((s) => s.outstandingAmount > 0);
  } else if (filter === "up_to_date") {
    summaries = summaries.filter((s) => s.outstandingAmount === 0);
  }

  const totalArrears = summaries.reduce((acc, s) => acc + s.outstandingAmount, 0);
  const totalCollected = summaries.reduce((acc, s) => acc + s.totalPaid, 0);
  const residentsInArrearsCount = summaries.filter(
    (s) => s.outstandingAmount > 0
  ).length;

  res.json({
    success: true,
    data: summaries,
    meta: {
      totalResidents: summaries.length,
      residentsInArrearsCount,
      totalArrears,
      totalCollected,
    },
  });
});

/**
 * @desc    Get detailed billing ledger for a specific resident
 * @route   GET /api/admin/billing/residents/:id/history
 * @access  Private (admin)
 */
exports.getResidentBillingHistory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await User.findOne({ _id: id, role: "resident" }).select(
    "-password"
  );
  if (!user) {
    return res
      .status(404)
      .json({ success: false, message: "Resident not found" });
  }

  const bills = await Bill.find({ userId: id }).sort({ createdAt: -1 });
  const paidBills = bills.filter((b) => b.status === "paid");
  const lastPaidBill = paidBills.length > 0 ? paidBills[0] : null;

  const { monthlyRate, outstandingMonths, outstandingAmount } =
    calculateOutstanding(user, lastPaidBill);
  const totalPaid = paidBills.reduce((acc, b) => acc + (b.amount || 0), 0);

  res.json({
    success: true,
    data: {
      resident: user,
      monthlyTariff: monthlyRate,
      lastPaymentDate: lastPaidBill ? lastPaidBill.paidAt : null,
      totalPaid,
      outstandingMonths,
      outstandingAmount,
      bills,
    },
  });
});
