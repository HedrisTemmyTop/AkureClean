const Household = require('../models/Household');
const asyncHandler = require('../utils/asyncHandler');
const { validationResult } = require('express-validator');

exports.createHousehold = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validation error', data: errors.array() });
  }

  const { address, coordinates, zoneId } = req.body;

  const existingHousehold = await Household.findOne({ userId: req.user._id });
  if (existingHousehold) {
    return res.status(400).json({ success: false, message: 'User already has a household registered' });
  }

  const household = await Household.create({
    userId: req.user._id,
    address,
    coordinates,
    zoneId
  });

  res.status(201).json({
    success: true,
    message: 'Household created successfully',
    data: household
  });
});

exports.updateHousehold = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { address, coordinates, zoneId } = req.body;

  let household = await Household.findById(id);
  if (!household) {
    return res.status(404).json({ success: false, message: 'Household not found' });
  }

  if (household.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Not authorized to update this household' });
  }

  household.address = address || household.address;
  household.coordinates = coordinates || household.coordinates;
  household.zoneId = zoneId || household.zoneId;

  await household.save();

  res.json({
    success: true,
    message: 'Household updated successfully',
    data: household
  });
});

exports.getMyHousehold = asyncHandler(async (req, res) => {
  const household = await Household.findOne({ userId: req.user._id }).populate('zoneId', 'name');
  if (!household) {
    return res.status(404).json({ success: false, message: 'Household not found for this user' });
  }

  res.json({
    success: true,
    data: household
  });
});
