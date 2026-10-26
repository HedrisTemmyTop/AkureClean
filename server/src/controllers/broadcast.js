const Broadcast = require('../models/Broadcast');
const Notification = require('../models/Notification');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const asyncHandler = require('../utils/asyncHandler');
const notificationService = require('../services/notification');

/**
 * @desc    Create and send a broadcast message to residents / users
 * @route   POST /api/broadcasts
 * @access  Private (Admin only)
 */
exports.createBroadcast = asyncHandler(async (req, res) => {
  const { title, message, priority, targetAudience, targetFilter } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ success: false, message: 'Broadcast title is required' });
  }

  if (!message || !message.trim()) {
    return res.status(400).json({ success: false, message: 'Broadcast message content is required' });
  }

  // Build user query based on audience & filter
  const query = {
    isDeleted: { $ne: true },
    isDeactivated: { $ne: true },
  };

  const audience = targetAudience || 'all_residents';
  if (audience === 'all_residents') {
    query.role = 'resident';
  } else if (audience === 'drivers') {
    query.role = 'driver';
  } else if (audience === 'all_users') {
    // Both residents and drivers, not admin
    query.role = { $in: ['resident', 'driver'] };
  } else if (audience === 'ward' && targetFilter?.ward) {
    query.role = 'resident';
    query.ward = targetFilter.ward;
  } else if (audience === 'pollingUnit' && targetFilter?.pollingUnit) {
    query.role = 'resident';
    query.pollingUnit = targetFilter.pollingUnit;
  }

  if (targetFilter?.localGovt) {
    query.localGovt = targetFilter.localGovt;
  }

  // Find target recipients
  const recipients = await User.find(query).select('_id name expoPushToken');

  // Save the broadcast record
  const broadcast = await Broadcast.create({
    senderId: req.user._id,
    senderName: req.user.name || 'AkureClean Admin',
    title: title.trim(),
    message: message.trim(),
    priority: priority || 'normal',
    targetAudience: audience,
    targetFilter: targetFilter || {},
    recipientsCount: recipients.length,
  });

  // Create in-app notifications for all matching recipients in bulk
  if (recipients.length > 0) {
    const notificationDocs = recipients.map((u) => ({
      userId: u._id,
      title: title.trim(),
      message: message.trim(),
      type: 'Broadcast',
      priority: priority || 'normal',
      relatedId: broadcast._id,
      relatedModel: 'Broadcast',
      read: false,
    }));

    await Notification.insertMany(notificationDocs, { ordered: false }).catch((err) => {
      console.error('[Broadcast InsertMany Error]:', err.message);
    });

    // Send Expo push notifications to all recipients with valid push tokens
    const pushTokens = recipients
      .map((u) => u.expoPushToken)
      .filter((token) => Boolean(token));

    if (pushTokens.length > 0) {
      notificationService
        .sendBulkNotification(pushTokens, `📢 ${title.trim()}`, message.trim())
        .catch((err) => console.error('[Broadcast Push Notification Error]:', err));
    }
  }

  // Log activity
  await ActivityLog.create({
    user: req.user._id,
    action: 'Create Broadcast',
    description: `Admin sent broadcast "${title.trim()}" to ${recipients.length} recipients`,
    details: {
      broadcastId: broadcast._id,
      recipientsCount: recipients.length,
      audience,
      priority: priority || 'normal',
    },
  }).catch((err) => console.error('[ActivityLog Error]:', err.message));

  res.status(201).json({
    success: true,
    message: `Broadcast successfully dispatched to ${recipients.length} resident(s)`,
    data: broadcast,
  });
});

/**
 * @desc    Get all broadcasts
 * @route   GET /api/broadcasts
 * @access  Private
 */
exports.getBroadcasts = asyncHandler(async (req, res) => {
  const broadcasts = await Broadcast.find()
    .sort({ createdAt: -1 })
    .populate('senderId', 'name email role')
    .lean();

  res.json({
    success: true,
    count: broadcasts.length,
    data: broadcasts,
  });
});

/**
 * @desc    Get the latest broadcast (for dashboard notification banners)
 * @route   GET /api/broadcasts/latest
 * @access  Private
 */
exports.getLatestBroadcast = asyncHandler(async (req, res) => {
  const latest = await Broadcast.findOne()
    .sort({ createdAt: -1 })
    .lean();

  res.json({
    success: true,
    data: latest || null,
  });
});

/**
 * @desc    Get a single broadcast by ID
 * @route   GET /api/broadcasts/:id
 * @access  Private
 */
exports.getBroadcastById = asyncHandler(async (req, res) => {
  const broadcast = await Broadcast.findById(req.params.id)
    .populate('senderId', 'name email role');

  if (!broadcast) {
    return res.status(404).json({ success: false, message: 'Broadcast not found' });
  }

  res.json({ success: true, data: broadcast });
});

/**
 * @desc    Delete a broadcast
 * @route   DELETE /api/broadcasts/:id
 * @access  Private (Admin only)
 */
exports.deleteBroadcast = asyncHandler(async (req, res) => {
  const broadcast = await Broadcast.findById(req.params.id);

  if (!broadcast) {
    return res.status(404).json({ success: false, message: 'Broadcast not found' });
  }

  await broadcast.deleteOne();

  // Log activity
  await ActivityLog.create({
    user: req.user._id,
    action: 'Delete Broadcast',
    description: `Admin deleted broadcast "${broadcast.title}"`,
    details: { broadcastId: broadcast._id },
  }).catch((err) => console.error('[ActivityLog Error]:', err.message));

  res.json({ success: true, message: 'Broadcast deleted successfully' });
});
