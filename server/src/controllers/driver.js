const CollectionLog = require('../models/CollectionLog');
const asyncHandler = require('../utils/asyncHandler');

exports.getMyRoute = asyncHandler(async (req, res) => {
  const log = await CollectionLog.findOne({
    driverId: req.user._id,
    status: 'in_progress'
  }).populate({
    path: 'route.householdId',
    populate: { path: 'userId', select: 'name phone' }
  });

  if (!log) {
    return res.status(404).json({ success: false, message: 'No active route found for today' });
  }

  res.json({
    success: true,
    data: log
  });
});

exports.collectHousehold = asyncHandler(async (req, res) => {
  const { householdId } = req.params;

  const log = await CollectionLog.findOne({
    driverId: req.user._id,
    status: 'in_progress'
  });

  if (!log) {
    return res.status(404).json({ success: false, message: 'No active route found' });
  }

  const routeStop = log.route.find(r => r.householdId.toString() === householdId);
  if (!routeStop) {
    return res.status(404).json({ success: false, message: 'Household not found in current route' });
  }

  if (routeStop.status === 'collected') {
    return res.status(400).json({ success: false, message: 'Household already collected' });
  }

  routeStop.status = 'collected';
  routeStop.collectedAt = new Date();

  // Check if all stops are collected
  const allCollected = log.route.every(r => r.status === 'collected');
  if (allCollected) {
    log.status = 'completed';
    log.completedAt = new Date();
  }

  await log.save();

  res.json({
    success: true,
    message: 'Household marked as collected',
    data: log
  });
});
