const Report = require('../models/Report');
const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');
const { validationResult } = require('express-validator');

/**
 * @desc    Submit a new waste pickup report
 * @route   POST /api/reports
 * @access  Private (resident)
 */
exports.createReport = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validation error', data: errors.array() });
  }

  const { street, landmark, lga, ward, type, severity, notes, preferredDate, location } = req.body;

  const report = await Report.create({
    residentId: req.user._id,
    street,
    landmark,
    lga,
    ward,
    type: type || 'General',
    severity: severity || 'Medium',
    notes,
    preferredDate: preferredDate ? new Date(preferredDate) : null,
    location: location || undefined, // GeoJSON Point from client
    status: 'Pending',
    requestedDate: new Date(),
  });

  res.status(201).json({
    success: true,
    message: 'Report submitted successfully',
    data: report,
  });
});

/**
 * @desc    Get all reports for the logged-in resident
 * @route   GET /api/reports/mine
 * @access  Private (resident)
 */
exports.getMyReports = asyncHandler(async (req, res) => {
  const reports = await Report.find({ residentId: req.user._id })
    .sort({ requestedDate: -1 });

  res.json({ success: true, data: reports });
});

/**
 * @desc    Get all reports (admin / driver view) with optional filters
 * @route   GET /api/reports?status=Pending&ward=Alagbaka
 * @access  Private (admin, driver)
 */
exports.getAllReports = asyncHandler(async (req, res) => {
  const { status, ward, lga, type, severity } = req.query;

  const filter = {};
  if (status)   filter.status = status;
  if (ward)     filter.ward = ward;
  if (lga)      filter.lga = lga;
  if (type)     filter.type = type;
  if (severity) filter.severity = severity;

  const reports = await Report.find(filter)
    .populate('residentId', 'name phone address')
    .populate('driverId', 'name phone')
    .sort({ requestedDate: -1 });

  res.json({ success: true, data: reports });
});

/**
 * @desc    Get a single report by ID
 * @route   GET /api/reports/:id
 * @access  Private (resident — own; driver; admin)
 */
exports.getReportById = asyncHandler(async (req, res) => {
  const report = await Report.findById(req.params.id)
    .populate('residentId', 'name phone address ward localGovt')
    .populate('driverId', 'name phone');

  if (!report) {
    return res.status(404).json({ success: false, message: 'Report not found' });
  }

  // Residents can only view their own reports
  if (req.user.role === 'resident' && report.residentId._id.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'Not authorized to view this report' });
  }

  res.json({ success: true, data: report });
});

/**
 * @desc    Update the status of a report (admin or driver)
 * @route   PATCH /api/reports/:id/status
 * @access  Private (admin, driver)
 */
exports.updateReportStatus = asyncHandler(async (req, res) => {
  const { status, driverId } = req.body;

  const validStatuses = ['Pending', 'Payment Pending', 'Scheduled', 'In Progress', 'Completed', 'Cancelled', 'Declined'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: `Status must be one of: ${validStatuses.join(', ')}` });
  }

  const report = await Report.findById(req.params.id);
  if (!report) {
    return res.status(404).json({ success: false, message: 'Report not found' });
  }

  report.status = status;
  if (driverId) report.driverId = driverId;
  if (status === 'Completed') report.completedDate = new Date();

  await report.save();

  // Notify the resident of the status change
  await Notification.create({
    userId: report.residentId,
    title: 'Report Status Updated',
    message: `Your waste report has been updated to: ${status}.`,
    type: 'StatusUpdate',
    relatedId: report._id,
    relatedModel: 'Report',
  });

  res.json({ success: true, message: 'Report status updated', data: report });
});
