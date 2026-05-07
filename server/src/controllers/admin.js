const User = require("../models/User");
const PickupRequest = require("../models/PickupRequest");
const Assignment = require("../models/Assignment");
const Schedule = require("../models/Schedule");
const CollectionLog = require("../models/CollectionLog");
const ActivityLog = require("../models/ActivityLog");
const Bill = require("../models/Bill");
const asyncHandler = require("../utils/asyncHandler");
const { logActivity } = require("../utils/logger");

exports.getAllLogs = asyncHandler(async (req, res) => {
  const logs = await ActivityLog.find()
    .populate("user", "name email role")
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    data: logs,
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
  const [
    totalReports,
    pendingReports,
    completedReports,
    totalDrivers,
    activeRoutes,
    activeSchedules,
    totalResidents,
    totalPayments,
  ] = await Promise.all([
    PickupRequest.countDocuments(),
    PickupRequest.countDocuments({ status: "pending" }),
    PickupRequest.countDocuments({ status: "completed" }),
    User.countDocuments({ role: "driver" }),
    Assignment.countDocuments({ status: { $in: ["InProgress", "Pending"] } }),
    Schedule.countDocuments(),
    User.countDocuments({ role: "resident" }),
    Bill.countDocuments({ status: "paid" }),
  ]);

  res.json({
    success: true,
    data: {
      totalReports,
      pendingReports,
      completedReports,
      totalDrivers,
      activeRoutes,
      activeSchedules,
      totalResidents,
      totalPayments,
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
