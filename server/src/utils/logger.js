const ActivityLog = require('../models/ActivityLog');

exports.logActivity = async (userId, action, description, details = {}, ipAddress = '127.0.0.1') => {
  try {
    const originIp = details?.ipAddress || details?.ip || ipAddress || '127.0.0.1';
    await ActivityLog.create({
      user: userId || null,
      action,
      description,
      details,
      ipAddress: originIp,
    });
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
};
