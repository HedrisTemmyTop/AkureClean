const ActivityLog = require('../models/ActivityLog');

exports.logActivity = async (userId, action, description, details = {}) => {
  try {
    await ActivityLog.create({
      user: userId,
      action,
      description,
      details
    });
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
};
