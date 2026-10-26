const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const User = require("../models/User");
const Bill = require("../models/Bill");
const env = require("../config/env");
const asyncHandler = require("../utils/asyncHandler");
const { validationResult } = require("express-validator");
const { logActivity } = require("../utils/logger");
const {
  sendVerificationOtpEmail,
  sendPasswordResetOtpEmail,
} = require("../utils/emailService");

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ id: userId }, env.JWT_ACCESS_SECRET, {
    expiresIn: "15m",
  });
  const refreshToken = jwt.sign({ id: userId }, env.JWT_REFRESH_SECRET, {
    expiresIn: "7d",
  });
  return { accessToken, refreshToken };
};

const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const formatUserResponse = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  address: user.address,
  houseDescription: user.houseDescription,
  localGovt: user.localGovt,
  ward: user.ward,
  pollingUnit: user.pollingUnit,
  houseType: user.houseType,
  numberOfRooms: user.numberOfRooms,
  numberOfShops: user.numberOfShops,
  numberOfWorkersRange: user.numberOfWorkersRange,
  truckPlateNumber: user.truckPlateNumber,
  truckCapacity: user.truckCapacity,
  role: user.role,
  isEmailVerified: user.isEmailVerified,
  createdAt: user.createdAt,
});

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

  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser && !existingUser.isDeleted) {
    if (existingUser.isEmailVerified !== false) {
      return res
        .status(400)
        .json({ success: false, message: "Email already exists" });
    }

    // Update unverified user record and resend fresh OTP
    const hashedPassword = await bcrypt.hash(password, 12);
    const otp = generateOtp();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    existingUser.name = name;
    existingUser.password = hashedPassword;
    existingUser.phone = phone;
    existingUser.role = role || "resident";
    existingUser.address = address;
    existingUser.houseDescription = houseDescription;
    existingUser.localGovt = localGovt;
    existingUser.ward = ward;
    existingUser.pollingUnit = pollingUnit;
    existingUser.location = location;
    existingUser.expoPushToken = req.body.expoPushToken;
    existingUser.houseType = houseType;
    existingUser.numberOfRooms = numberOfRooms;
    existingUser.numberOfShops = numberOfShops;
    existingUser.numberOfWorkersRange = numberOfWorkersRange;
    existingUser.truckPlateNumber = truckPlateNumber;
    existingUser.truckCapacity = truckCapacity;
    existingUser.emailVerificationOtp = otp;
    existingUser.emailVerificationExpires = otpExpires;
    await existingUser.save();

    sendVerificationOtpEmail(existingUser.email, existingUser.name, otp).catch(
      (err) => console.error("[Register Resend OTP Error]:", err.message)
    );

    return res.status(200).json({
      success: true,
      message: "Verification code sent to your email.",
      data: {
        requiresVerification: true,
        email: existingUser.email,
      },
    });
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const otp = generateOtp();
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

  const user = await User.create({
    name,
    email: normalizedEmail,
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
    isEmailVerified: false,
    emailVerificationOtp: otp,
    emailVerificationExpires: otpExpires,
  });

  // If resident, create Household record
  if (user.role.toLowerCase() === "resident") {
    const Household = require("../models/Household");

    await Household.create({
      userId: user._id,
      address,
      houseDescription,
      localGovt,
      ward,
      pollingUnit,
      location,
    });
  }

  sendVerificationOtpEmail(user.email, user.name, otp).catch((err) =>
    console.error("[Register OTP Error]:", err.message)
  );
  await logActivity(user._id, "Register", `User registered as ${user.role} (pending email verification)`);

  res.status(201).json({
    success: true,
    message: "Registration successful. Please verify your email with the 6-digit code sent.",
    data: {
      requiresVerification: true,
      email: user.email,
    },
  });
});

exports.verifyEmail = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      data: errors.array(),
    });
  }

  const { email, otp, expoPushToken } = req.body;
  const normalizedEmail = email.trim().toLowerCase();

  const user = await User.findOne({ email: normalizedEmail });
  if (!user || user.isDeleted) {
    return res.status(404).json({
      success: false,
      message: "Account not found",
    });
  }

  if (user.isEmailVerified && !user.emailVerificationOtp) {
    const { accessToken, refreshToken } = generateTokens(user._id);
    return res.json({
      success: true,
      message: "Email already verified",
      data: {
        user: formatUserResponse(user),
        accessToken,
        refreshToken,
      },
    });
  }

  if (!user.emailVerificationOtp || user.emailVerificationOtp !== otp.trim()) {
    return res.status(400).json({
      success: false,
      message: "Invalid verification code. Please check the 6-digit OTP and try again.",
    });
  }

  if (!user.emailVerificationExpires || user.emailVerificationExpires < new Date()) {
    return res.status(400).json({
      success: false,
      message: "Verification code has expired. Please request a new code.",
    });
  }

  user.isEmailVerified = true;
  user.emailVerificationOtp = undefined;
  user.emailVerificationExpires = undefined;
  if (expoPushToken) {
    user.expoPushToken = expoPushToken;
  }
  await user.save();

  await logActivity(user._id, "Verify Email", "User verified their email address");

  const { accessToken, refreshToken } = generateTokens(user._id);

  res.json({
    success: true,
    message: "Email verified successfully",
    data: {
      user: formatUserResponse(user),
      accessToken,
      refreshToken,
    },
  });
});

exports.resendVerificationOtp = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      data: errors.array(),
    });
  }

  const { email } = req.body;
  const normalizedEmail = email.trim().toLowerCase();

  const user = await User.findOne({ email: normalizedEmail });
  if (!user || user.isDeleted) {
    return res.status(404).json({
      success: false,
      message: "No account found with this email address",
    });
  }

  if (user.isEmailVerified) {
    return res.status(400).json({
      success: false,
      message: "Email is already verified. Please sign in.",
    });
  }

  const otp = generateOtp();
  user.emailVerificationOtp = otp;
  user.emailVerificationExpires = new Date(Date.now() + 10 * 60 * 1000);
  await user.save();

  sendVerificationOtpEmail(user.email, user.name, otp).catch((err) =>
    console.error("[Resend OTP Error]:", err.message)
  );

  res.json({
    success: true,
    message: "A new 6-digit verification code has been sent to your email.",
  });
});

exports.forgotPassword = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      data: errors.array(),
    });
  }

  const { email } = req.body;
  const normalizedEmail = email.trim().toLowerCase();

  const user = await User.findOne({ email: normalizedEmail });
  if (!user || user.isDeleted) {
    return res.status(404).json({
      success: false,
      message: "No account found with this email address.",
    });
  }

  if (user.isDeactivated) {
    return res.status(403).json({
      success: false,
      message: "This account is deactivated. Please contact support.",
    });
  }

  const otp = generateOtp();
  user.resetPasswordOtp = otp;
  user.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000);
  await user.save();

  sendPasswordResetOtpEmail(user.email, user.name, otp).catch((err) =>
    console.error("[Forgot Password OTP Error]:", err.message)
  );
  await logActivity(user._id, "Forgot Password", "Password reset OTP sent to email");

  res.json({
    success: true,
    message: "A 6-digit password reset code has been sent to your email.",
  });
});

exports.resetPassword = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      data: errors.array(),
    });
  }

  const { email, otp, newPassword } = req.body;
  const normalizedEmail = email.trim().toLowerCase();

  const user = await User.findOne({ email: normalizedEmail });
  if (!user || user.isDeleted) {
    return res.status(404).json({
      success: false,
      message: "Account not found",
    });
  }

  if (!user.resetPasswordOtp || user.resetPasswordOtp !== otp.trim()) {
    return res.status(400).json({
      success: false,
      message: "Invalid reset code. Please check the 6-digit OTP and try again.",
    });
  }

  if (!user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
    return res.status(400).json({
      success: false,
      message: "Reset code has expired. Please request a new code.",
    });
  }

  user.password = await bcrypt.hash(newPassword, 12);
  user.resetPasswordOtp = undefined;
  user.resetPasswordExpires = undefined;
  user.isEmailVerified = true;
  await user.save();

  await logActivity(user._id, "Reset Password", "User reset their password via email OTP");

  res.json({
    success: true,
    message: "Password reset successful. You can now sign in with your new password.",
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
  const normalizedEmail = email.trim().toLowerCase();

  const user = await User.findOne({ email: normalizedEmail });
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

  if (user.isEmailVerified === false) {
    const otp = generateOtp();
    user.emailVerificationOtp = otp;
    user.emailVerificationExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    await sendVerificationOtpEmail(user.email, user.name, otp);

    return res.status(403).json({
      success: false,
      requiresVerification: true,
      email: user.email,
      message: "Please verify your email address. A new 6-digit verification code has been sent to your email.",
    });
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
      user: formatUserResponse(user),
      accessToken,
      refreshToken,
    },
  });
});

exports.adminLogin = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      data: errors.array(),
    });
  }

  const { email, password } = req.body;

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

  // Reject non-admin roles strictly
  if (!user.role || user.role.toLowerCase() !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Only administrator accounts are authorized to sign in to the Admin Web Portal.",
    });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res
      .status(401)
      .json({ success: false, message: "Invalid credentials" });
  }

  await logActivity(user._id, "Admin Web Login", "Admin authenticated to web portal");

  const { accessToken, refreshToken } = generateTokens(user._id);

  res.json({
    success: true,
    message: "Admin login successful",
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

  await logActivity(
    req.user._id,
    "Deactivate Account",
    `User deactivated their own account`,
  );

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

  await logActivity(
    req.user._id,
    "Delete Account",
    `User deleted their own account`,
  );

  res.json({
    success: true,
    message: "Account deleted successfully",
  });
});
