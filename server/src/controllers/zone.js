const Zone = require('../models/Zone');
const asyncHandler = require('../utils/asyncHandler');
const { validationResult } = require('express-validator');

exports.createZone = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validation error', data: errors.array() });
  }

  const { name, streets } = req.body;

  const existingZone = await Zone.findOne({ name });
  if (existingZone) {
    return res.status(400).json({ success: false, message: 'Zone already exists' });
  }

  const zone = await Zone.create({
    name,
    streets: streets || []
  });

  res.status(201).json({
    success: true,
    message: 'Zone created successfully',
    data: zone
  });
});

exports.getZones = asyncHandler(async (req, res) => {
  const zones = await Zone.find().populate('assignedDriverId', 'name email phone');
  res.json({
    success: true,
    data: zones
  });
});

exports.assignDriver = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { driverId } = req.body;

  if (!driverId) {
    return res.status(400).json({ success: false, message: 'Driver ID is required' });
  }

  const zone = await Zone.findById(id);
  if (!zone) {
    return res.status(404).json({ success: false, message: 'Zone not found' });
  }

  zone.assignedDriverId = driverId;
  await zone.save();

  res.json({
    success: true,
    message: 'Driver assigned to zone successfully',
    data: zone
  });
});
