const User = require('../models/User');
const CollectionLog = require('../models/CollectionLog');
const asyncHandler = require('../utils/asyncHandler');

exports.getAllLogs = asyncHandler(async (req, res) => {
  const logs = await CollectionLog.find()
    .populate('zoneId', 'name')
    .populate('driverId', 'name email phone')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    data: logs
  });
});

exports.getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select('-password').sort({ createdAt: -1 });

  res.json({
    success: true,
    data: users
  });
});
