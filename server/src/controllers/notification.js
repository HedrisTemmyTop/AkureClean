const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get all notifications for the logged-in user
 * @route   GET /api/notifications
 * @access  Private (Any authenticated user)
 */
exports.getNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ userId: req.user._id })
    .sort({ createdAt: -1 });

  res.json({ success: true, data: notifications });
});

/**
 * @desc    Get count of unread notifications
 * @route   GET /api/notifications/unread-count
 * @access  Private
 */
exports.getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments({ userId: req.user._id, read: false });
  res.json({ success: true, data: { count } });
});

/**
 * @desc    Mark a single notification as read
 * @route   PATCH /api/notifications/:id/read
 * @access  Private
 */
exports.markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!notification) {
    return res.status(404).json({ success: false, message: 'Notification not found' });
  }

  notification.read = true;
  await notification.save();

  res.json({ success: true, message: 'Notification marked as read', data: notification });
});

/**
 * @desc    Mark all notifications as read for the logged-in user
 * @route   PATCH /api/notifications/mark-all-read
 * @access  Private
 */
exports.markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { userId: req.user._id, read: false },
    { $set: { read: true } }
  );

  res.json({ success: true, message: 'All notifications marked as read' });
});
