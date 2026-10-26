const PickupRequest = require("../models/PickupRequest");
const Household = require("../models/Household");
const Notification = require("../models/Notification");
const paystackService = require("../services/paystack");
const notificationService = require("../services/notification");
const { logActivity } = require("../utils/logger");
const asyncHandler = require("../utils/asyncHandler");
const { validationResult } = require("express-validator");
const Assignment = require("../models/Assignment");
const { uploadImage } = require("../services/imageUpload");
const { notifyPickupResident } = require("./verification");
const {
  getAvailableSlotsForResidentData,
  getDriverCoverage,
  normalizeStr,
  escapeRegex,
  getTodayStr,
} = require("./availability");

exports.createPickupRequest = asyncHandler(async (req, res) => {
  const { type, notes, scheduledDate, scheduledTime, amount, image } = req.body;
  const user = req.user;

  // Instead of strict Household lookup, we use address/location from user profile
  if (!user.address && !user.location) {
    return res.status(400).json({
      success: false,
      message:
        "Please complete your profile with address and location before requesting a pickup.",
    });
  }

  if (!user.pollingUnit || !user.localGovt) {
    return res.status(400).json({
      success: false,
      message:
        "Please update your profile with your Local Government and Polling Unit before requesting a pickup.",
    });
  }

  // Enforce that the resident selects one of the available days for the driver assigned to their Polling Unit & Local Govt
  const availabilityInfo = await getAvailableSlotsForResidentData(user);
  if (availabilityInfo.availableDates.length === 0) {
    return res.status(400).json({
      success: false,
      message:
        availabilityInfo.message ||
        "No available pickup days found for your Polling Unit and Local Government this month.",
    });
  }

  const cleanDate = (scheduledDate || "").trim();
  if (!cleanDate || !availabilityInfo.availableDates.includes(cleanDate)) {
    return res.status(400).json({
      success: false,
      message: `Please select one of the available pickup days set by your assigned collector (${availabilityInfo.availableDates.join(", ")}).`,
    });
  }

  const matchedSlot = availabilityInfo.availableSlots.find(
    (s) => s.date === cleanDate
  );

  const imageUrl = await uploadImage(image, "smartenv/pickups");

  const pickup = await PickupRequest.create({
    userId: user._id,
    type: type || "General",
    notes: notes || "",
    image: imageUrl,
    address: user.address,
    localGovt: user.localGovt,
    ward: user.ward,
    pollingUnit: user.pollingUnit,
    scheduledDate: cleanDate,
    scheduledTime: scheduledTime || matchedSlot?.timeSlot || "08:00 AM",
    householdId: null,
    extraFee: amount ? Number(amount) : 0,
  });

  // Try to find household for legacy tracking but don't fail if missing
  const household = await Household.findOne({ userId: user._id });
  if (household) {
    pickup.householdId = household._id;
    await pickup.save();
  }

  await logActivity(
    req.user._id,
    "Request Pickup",
    `Requested a new ${type || "General"} pickup for ${cleanDate}`,
  );

  res.status(201).json({
    success: true,
    message: "Pickup request created successfully",
    data: pickup,
  });
});

// payPickupFee removed as payment is physical

/**
 * Polling units and Local Govts on the driver's assigned routes.
 * Only the driver assigned to that Polling Unit and Local Govt can see and accept pickups.
 */
const getDriverAreaMatchers = async (driverId) => {
  const coverage = await getDriverCoverage(driverId);

  const puRegexes = coverage.pollingUnits.map(
    (pu) => new RegExp(`^${escapeRegex(pu)}$`, "i"),
  );
  const lgaRegexes = coverage.localGovts.map(
    (lga) => new RegExp(`^${escapeRegex(lga)}$`, "i"),
  );

  return {
    puRegexes,
    lgaRegexes,
    normPUs: new Set(coverage.pollingUnits.map((p) => normalizeStr(p))),
    normLgas: new Set(coverage.localGovts.map((l) => normalizeStr(l))),
  };
};

const pickupOnRoute = (pickup, matchers) => {
  const pPu = normalizeStr(pickup.pollingUnit || pickup.userId?.pollingUnit);
  const pLga = normalizeStr(pickup.localGovt || pickup.userId?.localGovt);
  if (!pPu || !matchers.normPUs.has(pPu)) return false;
  if (pLga && matchers.normLgas.size > 0 && !matchers.normLgas.has(pLga)) {
    return false;
  }
  return true;
};

exports.getAllAvailablePickups = asyncHandler(async (req, res) => {
  const matchers = await getDriverAreaMatchers(req.user._id);

  if (matchers.puRegexes.length === 0) {
    return res.json({ success: true, data: [] });
  }

  const today = getTodayStr();

  const query = {
    status: "pending",
    pollingUnit: { $in: matchers.puRegexes },
    $or: [
      { scheduledDate: { $gte: today } },
      { scheduledDate: { $exists: false } },
      { scheduledDate: "" },
    ],
  };

  if (matchers.lgaRegexes.length > 0) {
    query.localGovt = { $in: matchers.lgaRegexes };
  }

  const pickups = await PickupRequest.find(query)
    .populate("userId", "name phone address localGovt ward pollingUnit")
    .sort({ scheduledDate: 1, createdAt: -1 });

  res.json({
    success: true,
    data: pickups,
  });
});

exports.getDriverPickups = asyncHandler(async (req, res) => {
  // All pickups this driver has accepted and still needs to collect
  const activePickups = await PickupRequest.find({
    driverId: req.user._id,
    status: "accepted",
  })
    .populate("userId", "name phone address localGovt ward pollingUnit")
    .sort({ acceptedAt: 1 });

  res.json({
    success: true,
    data: activePickups,
    hasActive: activePickups.length > 0,
    count: activePickups.length,
  });
});

exports.getAllPickups = asyncHandler(async (req, res) => {
  const { startDate, endDate, status } = req.query;

  const filter = {};
  if (startDate && endDate) {
    filter.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    };
  }
  if (status && status !== "all") {
    filter.status = status;
  }

  const pickups = await PickupRequest.find(filter)
    .populate("userId", "name phone email address localGovt ward pollingUnit houseDescription")
    .populate("driverId", "name phone")
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    data: pickups,
  });
});

exports.respondToPickup = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { action } = req.body;

  if (action !== "accept") {
    return res
      .status(400)
      .json({ success: false, message: "Drivers can only accept pickups" });
  }

  const pickup = await PickupRequest.findById(id).populate(
    "userId",
    "expoPushToken localGovt ward pollingUnit",
  );
  if (!pickup) {
    return res
      .status(404)
      .json({ success: false, message: "Pickup request not found" });
  }

  // Check if pickup is still pending
  if (pickup.status !== "pending") {
    return res.status(400).json({
      success: false,
      message: "This pickup has already been taken.",
    });
  }

  // Only the driver assigned to this polling unit and local govt may accept it
  const matchers = await getDriverAreaMatchers(req.user._id);
  if (!pickupOnRoute(pickup, matchers)) {
    return res.status(403).json({
      success: false,
      message:
        "This pickup is not in your assigned Polling Unit and Local Government.",
    });
  }

  pickup.status = "accepted";
  pickup.driverId = req.user._id;
  pickup.acceptedAt = new Date();
  await pickup.save();
  if (pickup.userId.expoPushToken) {
    await notificationService.sendPushNotification(
      pickup.userId.expoPushToken,
      "Pickup Accepted",
      "A driver is on their way to your location!",
    );
  }

  // Create in-app notification for resident
  await Notification.create({
    userId: pickup.userId._id,
    title: "Pickup Accepted",
    message: "A driver has accepted your pickup request and is on their way!",
    type: "StatusUpdate",
    relatedId: pickup._id,
    relatedModel: "PickupRequest",
  });

  await logActivity(req.user._id, "Accept Pickup", `Accepted pickup request`);

  res.json({
    success: true,
    message: "Pickup accepted",
    data: pickup,
  });
});

/**
 * Driver marks an accepted pickup as collected.
 * It then waits for the resident to confirm and the admin to approve.
 */
exports.markPickupCollected = asyncHandler(async (req, res) => {
  const pickup = await PickupRequest.findOne({
    _id: req.params.id,
    driverId: req.user._id,
  });

  if (!pickup) {
    return res
      .status(404)
      .json({ success: false, message: "Pickup not found" });
  }

  if (pickup.status !== "accepted") {
    return res.status(400).json({
      success: false,
      message: "Only accepted pickups can be marked as collected",
    });
  }

  pickup.status = "collected";
  pickup.collectedAt = new Date();
  pickup.verificationStatus = "AwaitingResident";
  await pickup.save();

  await notifyPickupResident(
    pickup,
    "Please confirm your pickup",
    "The driver marked your requested pickup as collected. Please confirm that your waste was collected.",
  );

  await logActivity(req.user._id, "Collect Pickup", `Marked pickup as collected`);

  res.json({
    success: true,
    message: "Pickup marked as collected",
    data: pickup,
  });
});

/**
 * Driver could not collect (bin not out, wrong waste type, ...).
 * The resident is notified and can re-request; the admin can see it.
 */
exports.rejectPickup = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  if (!reason || !reason.trim()) {
    return res
      .status(400)
      .json({ success: false, message: "A reason is required" });
  }

  const pickup = await PickupRequest.findOne({
    _id: req.params.id,
    driverId: req.user._id,
  });

  if (!pickup) {
    return res
      .status(404)
      .json({ success: false, message: "Pickup not found" });
  }

  if (pickup.status !== "accepted") {
    return res.status(400).json({
      success: false,
      message: "Only accepted pickups can be rejected",
    });
  }

  pickup.status = "rejected";
  pickup.driverRejectReason = reason.trim();
  await pickup.save();

  await notifyPickupResident(
    pickup,
    "Pickup could not be completed",
    `The driver could not collect your pickup: ${reason.trim()}. You can submit a new request.`,
  );

  await logActivity(req.user._id, "Reject Pickup", `Rejected pickup: ${reason.trim()}`);

  res.json({
    success: true,
    message: "Pickup rejected",
    data: pickup,
  });
});

exports.cancelPickup = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const pickup = await PickupRequest.findOne({
    _id: id,
    userId: req.user._id,
  });

  if (!pickup) {
    return res
      .status(404)
      .json({ success: false, message: "Pickup not found" });
  }

  if (pickup.status !== "pending") {
    return res.status(400).json({
      success: false,
      message: "You can only cancel a pickup that has not been accepted yet.",
    });
  }

  pickup.status = "cancelled";
  await pickup.save();

  await logActivity(req.user._id, "Cancel Pickup", `Cancelled pickup request`);

  res.json({
    success: true,
    message: "Pickup cancelled successfully",
    data: pickup,
  });
});

exports.getMyPickups = asyncHandler(async (req, res) => {
  const pickups = await PickupRequest.find({ userId: req.user._id }).sort({
    createdAt: -1,
  });
  res.json({
    success: true,
    data: pickups,
  });
});

exports.getPickupById = asyncHandler(async (req, res) => {
  const pickup = await PickupRequest.findById(req.params.id)
    .populate(
      "userId",
      "name phone address localGovt ward pollingUnit houseDescription location",
    )
    .populate("driverId", "name phone");

  if (!pickup) {
    return res
      .status(404)
      .json({ success: false, message: "Pickup not found" });
  }

  res.json({ success: true, data: pickup });
});

exports.getCollectorPickups = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const pickups = await PickupRequest.find({ driverId: id })
    .populate("userId", "name phone address localGovt ward pollingUnit")
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    data: pickups,
  });
});
