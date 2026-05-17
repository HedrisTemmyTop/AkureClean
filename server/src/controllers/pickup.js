const PickupRequest = require("../models/PickupRequest");
const Household = require("../models/Household");
const Notification = require("../models/Notification");
const paystackService = require("../services/paystack");
const notificationService = require("../services/notification");
const { logActivity } = require("../utils/logger");
const asyncHandler = require("../utils/asyncHandler");
const { validationResult } = require("express-validator");
const Assignment = require("../models/Assignment");

exports.createPickupRequest = asyncHandler(async (req, res) => {
  const { type, notes, scheduledDate, scheduledTime, amount } = req.body;
  const user = req.user;

  // Instead of strict Household lookup, we use address/location from user profile
  if (!user.address && !user.location) {
    return res.status(400).json({
      success: false,
      message:
        "Please complete your profile with address and location before requesting a pickup.",
    });
  }

  const pickup = await PickupRequest.create({
    userId: user._id,
    type: type || "General",
    notes: notes || "",
    address: user.address,
    localGovt: user.localGovt,
    ward: user.ward,
    pollingUnit: user.pollingUnit,
    scheduledDate,
    scheduledTime,
    householdId: null,
    extraFee: amount || 1500,
  });

  // Try to find household for legacy tracking but don't fail if missing
  const Household = require("../models/Household");
  const household = await Household.findOne({ userId: user._id });
  if (household) {
    pickup.householdId = household._id;
    await pickup.save();
  }

  await logActivity(
    req.user._id,
    "Request Pickup",
    `Requested a new ${type || "General"} pickup`,
  );

  res.status(201).json({
    success: true,
    message: "Pickup request created successfully",
    data: pickup,
  });
});

// payPickupFee removed as payment is physical

exports.getAllAvailablePickups = asyncHandler(async (req, res) => {
  const driverId = req.user._id; // or however you get the driver from the request

  // Step 1 — Get the driver's last assignment
  const lastAssignment = await Assignment.findOne({ driverId })
    .sort({ createdAt: -1 })
    .lean();

  if (!lastAssignment) {
    return res.json({ success: true, data: [] });
  }

  // Step 2 — Extract polling units from the assignment's stops
  const pollingUnits = [
    ...new Set(lastAssignment.stops.map((s) => s.pollingUnit).filter(Boolean)),
  ];
  const pollingUnitRegexes = pollingUnits.map(
    (pu) => new RegExp(pu.replace(/\s+/g, "\\s+"), "i"),
  );
  const today = new Date().toISOString().split("T")[0];

  const pickups = await PickupRequest.find({
    status: "pending",
    pollingUnit: { $in: pollingUnitRegexes },
    $or: [
      { scheduledDate: { $gte: today } },
      { scheduledDate: { $exists: false } },
      { scheduledDate: "" },
    ],
  }).populate("userId", "name phone address localGovt ward pollingUnit");
  console.log("pickups", pickups);
  res.json({
    success: true,
    data: pickups,
  });
});
exports.getDriverPickups = asyncHandler(async (req, res) => {
  const driverId = req.user._id;

  // Check if this driver has an active (accepted) pickup
  const activePickup = await PickupRequest.findOne({
    driverId: driverId,
    status: "accepted",
  }).populate("userId", "name phone address localGovt ward pollingUnit");

  res.json({
    success: true,
    data: activePickup ? [activePickup] : [],
    hasActive: !!activePickup,
  });
});

exports.getAllPickups = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const filter = {};
  if (startDate && endDate) {
    filter.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    };
  }

  const pickups = await PickupRequest.find(filter)
    .populate("userId", "name phone address localGovt ward pollingUnit")
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
    "expoPushToken",
  );
  if (!pickup) {
    return res
      .status(404)
      .json({ success: false, message: "Pickup request not found" });
  }

  // Check if driver already has an active pickup
  const active = await PickupRequest.findOne({
    driverId: req.user._id,
    status: "accepted",
  });
  if (active) {
    return res.status(400).json({
      success: false,
      message:
        "You must complete your current pickup before accepting a new one.",
    });
  }

  // Check if pickup is still pending
  if (pickup.status !== "pending") {
    return res.status(400).json({
      success: false,
      message: "This pickup has already been taken.",
    });
  }

  pickup.status = "accepted";
  pickup.driverId = req.user._id;
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

exports.completePickupByResident = asyncHandler(async (req, res) => {
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

  if (pickup.status !== "accepted") {
    return res.status(400).json({
      success: false,
      message: "Pickup must be accepted before completion",
    });
  }

  pickup.status = "completed";
  await pickup.save();

  await logActivity(
    req.user._id,
    "Complete Pickup",
    `Marked pickup as completed`,
  );

  res.json({
    success: true,
    message: "Pickup marked as completed",
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
