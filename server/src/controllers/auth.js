const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const User = require("../models/User");
const Bill = require("../models/Bill");
const env = require("../config/env");
const asyncHandler = require("../utils/asyncHandler");
const { validationResult } = require("express-validator");
const { logActivity } = require("../utils/logger");

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ id: userId }, env.JWT_ACCESS_SECRET, {
    expiresIn: "15m",
  });
  const refreshToken = jwt.sign({ id: userId }, env.JWT_REFRESH_SECRET, {
    expiresIn: "7d",
  });
  return { accessToken, refreshToken };
};

exports.register = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      data: errors.array(),
    });
  }

  const {
    name,
    email,
    password,
    phone,
    role,
    address,
    houseDescription,
    localGovt,
    ward,
    pollingUnit,
    location,
    houseType,
    numberOfRooms,
    numberOfShops,
    numberOfWorkersRange,
    truckPlateNumber,
    truckCapacity,
  } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res
      .status(400)
      .json({ success: false, message: "Email already exists" });
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    phone,
    role: role || "resident",
    address,
    houseDescription,
    localGovt,
    ward,
    pollingUnit,
    location,
    expoPushToken: req.body.expoPushToken,
    houseType,
    numberOfRooms,
    numberOfShops,
    numberOfWorkersRange,
    truckPlateNumber,
    truckCapacity,
  });

  // If resident, generate bill for current year and create Household record
  if (user.role.toLowerCase() === "resident") {
    const currentYear = new Date().getFullYear();
    const Household = require("../models/Household");
    const Bill = require("../models/Bill");

    await Household.create({
      userId: user._id,
      address,
      houseDescription,
      localGovt,
      ward,
      pollingUnit,
      location,
    });

    await Bill.create({
      userId: user._id,
      year: currentYear,
      amount: 5000, // Hardcoded for now
      status: "unpaid",
    });
  }

  await logActivity(user._id, "Register", `User registered as ${user.role}`);

  const { accessToken, refreshToken } = generateTokens(user._id);

  res.status(201).json({
    success: true,
    message: "User registered successfully",
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        houseDescription: user.houseDescription,
        localGovt: user.localGovt,
        ward: user.ward,
        pollingUnit: user.pollingUnit,
        role: user.role,
        createdAt: user.createdAt,
      },
      accessToken,
      refreshToken,
    },
  });
});

exports.login = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      data: errors.array(),
    });
  }

  const { email, password, expoPushToken } = req.body;

  const user = await User.findOne({ email });
  if (!user || user.isDeleted) {
    return res
      .status(401)
      .json({ success: false, message: "Invalid credentials" });
  }

  if (user.isDeactivated) {
    return res.status(403).json({
      success: false,
      message: user.deactivationReason
        ? `Your account has been deactivated. Reason: ${user.deactivationReason}`
        : "Your account has been deactivated. Please contact support.",
    });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res
      .status(401)
      .json({ success: false, message: "Invalid credentials" });
  }

  if (expoPushToken) {
    user.expoPushToken = expoPushToken;
    await user.save();
  }

  await logActivity(user._id, "Login", `User logged in`);

  const { accessToken, refreshToken } = generateTokens(user._id);

  res.json({
    success: true,
    message: "Login successful",
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        houseDescription: user.houseDescription,
        localGovt: user.localGovt,
        ward: user.ward,
        role: user.role,
        createdAt: user.createdAt,
      },
      accessToken,
      refreshToken,
    },
  });
});

exports.refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res
      .status(401)
      .json({ success: false, message: "Refresh token required" });
  }

  try {
    const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "User not found" });
    }

    const tokens = generateTokens(user._id);

    res.json({
      success: true,
      message: "Token refreshed",
      data: tokens,
    });
  } catch (err) {
    res
      .status(403)
      .json({ success: false, message: "Invalid or expired refresh token" });
  }
});

/**
 * @desc    Get current logged-in user's profile
 * @route   GET /api/auth/me
 * @access  Private
 */
exports.getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("-password");
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }
  res.json({
    success: true,
    data: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      houseDescription: user.houseDescription,
      localGovt: user.localGovt,
      ward: user.ward,
      role: user.role,
      createdAt: user.createdAt,
    },
  });
});

/**
 * @desc    Update current logged-in user's profile
 * @route   PATCH /api/auth/me
 * @access  Private
 */
exports.updateMe = asyncHandler(async (req, res) => {
  const allowedUpdates = [
    "name",
    "phone",
    "address",
    "houseDescription",
    "localGovt",
    "ward",
    "pollingUnit",
    "location",
    "expoPushToken",
    "houseType",
    "numberOfRooms",
    "numberOfShops",
    "numberOfWorkersRange",
    "truckPlateNumber",
    "truckCapacity",
  ];
  const updates = {};
  allowedUpdates.forEach((field) => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: updates },
    { new: true, runValidators: true },
  ).select("-password");

  res.json({
    success: true,
    message: "Profile updated",
    data: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      houseDescription: user.houseDescription,
      localGovt: user.localGovt,
      ward: user.ward,
      role: user.role,
      createdAt: user.createdAt,
    },
  });
});

/**
 * @desc    Update expo push token
 * @route   PATCH /api/auth/push-token
 * @access  Private
 */
exports.updatePushToken = asyncHandler(async (req, res) => {
  const { expoPushToken } = req.body;

  if (!expoPushToken) {
    return res
      .status(400)
      .json({ success: false, message: "expoPushToken is required" });
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { expoPushToken } },
    { new: true },
  ).select("-password");

  res.json({
    success: true,
    message: "Push token updated",
    data: {
      id: user._id,
      expoPushToken: user.expoPushToken,
    },
  });
});

/**
 * @desc    Deactivate current logged-in user's account
 * @route   PATCH /api/auth/deactivate
 * @access  Private
 */
exports.deactivateMe = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { isDeactivated: true } },
    { new: true },
  );

  await logActivity(req.user._id, "Deactivate Account", `User deactivated their own account`);

  res.json({
    success: true,
    message: "Account deactivated successfully",
  });
});

/**
 * @desc    Delete current logged-in user's account (soft delete)
 * @route   DELETE /api/auth/me
 * @access  Private
 */
exports.deleteMe = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { isDeleted: true, isDeactivated: true } },
    { new: true },
  );

  await logActivity(req.user._id, "Delete Account", `User deleted their own account`);

  res.json({
    success: true,
    message: "Account deleted successfully",
  });
});
