const Schedule = require('../models/Schedule');
const asyncHandler = require('../utils/asyncHandler');
const { validationResult } = require('express-validator');

/**
 * @desc    Get collection schedules for the resident's own ward/zone
 * @route   GET /api/schedules/mine
 * @access  Private (Resident)
 */
exports.getMySchedules = asyncHandler(async (req, res) => {
  const { ward, localGovt } = req.user;

  const filter = {};
  if (ward) filter.ward = ward;
  if (localGovt) filter.lga = localGovt;

  const schedules = await Schedule.find(filter)
    .populate('zoneId', 'name')
    .sort({ dayOfWeek: 1 });

  res.json({ success: true, data: schedules });
});

/**
 * @desc    Get all schedules (admin)
 * @route   GET /api/schedules
 * @access  Private (Admin)
 */
exports.getAllSchedules = asyncHandler(async (req, res) => {
  const schedules = await Schedule.find()
    .populate('zoneId', 'name')
    .sort({ createdAt: -1 });

  res.json({ success: true, data: schedules });
});

/**
 * @desc    Create a new schedule
 * @route   POST /api/schedules
 * @access  Private (Admin)
 */
exports.createSchedule = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validation error', data: errors.array() });
  }

  const { zoneId, lga, ward, dayOfWeek, nextPickup } = req.body;

  const schedule = await Schedule.create({
    zoneId,
    lga,
    ward,
    dayOfWeek,
    nextPickup: new Date(nextPickup),
  });

  res.status(201).json({
    success: true,
    message: 'Schedule created',
    data: schedule,
  });
});

/**
 * @desc    Update a schedule (e.g., advance nextPickup date)
 * @route   PATCH /api/schedules/:id
 * @access  Private (Admin)
 */
exports.updateSchedule = asyncHandler(async (req, res) => {
  const { dayOfWeek, nextPickup, lga, ward } = req.body;

  const schedule = await Schedule.findById(req.params.id);
  if (!schedule) {
    return res.status(404).json({ success: false, message: 'Schedule not found' });
  }

  if (dayOfWeek) schedule.dayOfWeek = dayOfWeek;
  if (nextPickup) schedule.nextPickup = new Date(nextPickup);
  if (lga)       schedule.lga = lga;
  if (ward)      schedule.ward = ward;

  await schedule.save();

  res.json({ success: true, message: 'Schedule updated', data: schedule });
});
