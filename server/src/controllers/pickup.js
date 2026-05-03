const PickupRequest = require('../models/PickupRequest');
const Household = require('../models/Household');
const paystackService = require('../services/paystack');
const notificationService = require('../services/notification');
const asyncHandler = require('../utils/asyncHandler');
const { validationResult } = require('express-validator');

exports.createPickupRequest = asyncHandler(async (req, res) => {
  const household = await Household.findOne({ userId: req.user._id });
  if (!household) {
    return res.status(400).json({ success: false, message: 'Household not found for this user' });
  }

  const pickup = await PickupRequest.create({
    userId: req.user._id,
    householdId: household._id,
    extraFee: 1500 // Hardcoded extra fee
  });

  res.status(201).json({
    success: true,
    message: 'Pickup request created',
    data: pickup
  });
});

exports.payPickupFee = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const pickup = await PickupRequest.findOne({ _id: id, userId: req.user._id });
  if (!pickup) {
    return res.status(404).json({ success: false, message: 'Pickup request not found' });
  }

  if (pickup.paymentStatus === 'paid') {
    return res.status(400).json({ success: false, message: 'Fee already paid' });
  }

  const metadata = {
    type: 'pickup_fee',
    pickupId: pickup._id,
    userId: req.user._id
  };

  const paymentData = await paystackService.initializeTransaction(
    req.user.email,
    pickup.extraFee,
    metadata
  );

  res.json({
    success: true,
    data: {
      authorizationUrl: paymentData.data.authorization_url,
      reference: paymentData.data.reference
    }
  });
});

exports.getDriverPickups = asyncHandler(async (req, res) => {
  // Driver gets pending pickup requests in their assigned zone
  const Zone = require('../models/Zone');
  const zone = await Zone.findOne({ assignedDriverId: req.user._id });
  
  if (!zone) {
    return res.status(404).json({ success: false, message: 'No zone assigned to this driver' });
  }

  // Find households in this zone
  const households = await Household.find({ zoneId: zone._id });
  const householdIds = households.map(h => h._id);

  const pickups = await PickupRequest.find({
    householdId: { $in: householdIds },
    status: 'pending',
    paymentStatus: 'paid' // Driver only sees paid requests
  }).populate('householdId');

  res.json({
    success: true,
    data: pickups
  });
});

exports.respondToPickup = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { action } = req.body;

  if (!['accept', 'decline'].includes(action)) {
    return res.status(400).json({ success: false, message: 'Action must be accept or decline' });
  }

  const pickup = await PickupRequest.findById(id).populate('userId', 'expoPushToken');
  if (!pickup) {
    return res.status(404).json({ success: false, message: 'Pickup request not found' });
  }

  pickup.status = action === 'accept' ? 'accepted' : 'declined';
  pickup.driverId = req.user._id;
  await pickup.save();

  if (action === 'accept' && pickup.userId.expoPushToken) {
    await notificationService.sendPushNotification(
      pickup.userId.expoPushToken,
      'Pickup Request Accepted',
      'A driver has accepted your pickup request and will arrive soon.'
    );
  }

  res.json({
    success: true,
    message: `Pickup request ${action}ed`,
    data: pickup
  });
});
