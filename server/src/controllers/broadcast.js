const Broadcast = require('../models/Broadcast');
const Notification = require('../models/Notification');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const asyncHandler = require('../utils/asyncHandler');
const notificationService = require('../services/notification');

function escapeRegex(text) {
  if (!text) return '';
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

/**
 * Build MongoDB filter for residents to ensure they only receive broadcasts
 * that are either city-wide or match their localGovt / ward / pollingUnit.
 */
function buildResidentBroadcastQuery(user) {
  if (!user || user.role === 'admin') {
    return {};
  }

  // Audience condition: residents don't get driver-only dispatches
  const conditions = [
    { targetAudience: { $ne: 'drivers' } }
  ];

  // LocalGovt dimension
  if (user.localGovt && user.localGovt.trim()) {
    conditions.push({
      $or: [
        { 'targetFilter.localGovt': null },
        { 'targetFilter.localGovt': '' },
        { 'targetFilter.localGovt': { $exists: false } },
        { 'targetFilter.localGovt': { $regex: new RegExp(`^${escapeRegex(user.localGovt.trim())}$`, 'i') } },
      ],
    });
  } else {
    conditions.push({
      $or: [
        { 'targetFilter.localGovt': null },
        { 'targetFilter.localGovt': '' },
        { 'targetFilter.localGovt': { $exists: false } },
      ],
    });
  }

  // Ward dimension
  if (user.ward && user.ward.trim()) {
    conditions.push({
      $or: [
        { 'targetFilter.ward': null },
        { 'targetFilter.ward': '' },
        { 'targetFilter.ward': { $exists: false } },
        { 'targetFilter.ward': { $regex: new RegExp(`^${escapeRegex(user.ward.trim())}$`, 'i') } },
      ],
    });
  } else {
    conditions.push({
      $or: [
        { 'targetFilter.ward': null },
        { 'targetFilter.ward': '' },
        { 'targetFilter.ward': { $exists: false } },
      ],
    });
  }

  // Polling Unit dimension
  if (user.pollingUnit && user.pollingUnit.trim()) {
    conditions.push({
      $or: [
        { 'targetFilter.pollingUnit': null },
        { 'targetFilter.pollingUnit': '' },
        { 'targetFilter.pollingUnit': { $exists: false } },
        { 'targetFilter.pollingUnit': { $regex: new RegExp(`^${escapeRegex(user.pollingUnit.trim())}$`, 'i') } },
      ],
    });
  } else {
    conditions.push({
      $or: [
        { 'targetFilter.pollingUnit': null },
        { 'targetFilter.pollingUnit': '' },
        { 'targetFilter.pollingUnit': { $exists: false } },
      ],
    });
  }

  return { $and: conditions };
}

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

  // Build user query based on audience & location filters
  const query = {
    isDeleted: { $ne: true },
    isDeactivated: { $ne: true },
  };

  const audience = targetAudience || 'all_residents';
  if (audience === 'drivers') {
    query.role = 'driver';
  } else if (audience === 'all_users') {
    query.role = { $in: ['resident', 'driver'] };
  } else {
    query.role = 'resident';
  }

  // Parse location filters (Optional: LGA, Ward, Polling Unit)
  const lga = targetFilter?.localGovt && typeof targetFilter.localGovt === 'string' ? targetFilter.localGovt.trim() : null;
  const ward = targetFilter?.ward && typeof targetFilter.ward === 'string' ? targetFilter.ward.trim() : null;
  const pu = targetFilter?.pollingUnit && typeof targetFilter.pollingUnit === 'string' ? targetFilter.pollingUnit.trim() : null;

  const cleanedFilter = {
    localGovt: lga || null,
    ward: ward || null,
    pollingUnit: pu || null,
  };

  if (cleanedFilter.localGovt) {
    query.localGovt = { $regex: new RegExp(`^${escapeRegex(cleanedFilter.localGovt)}$`, 'i') };
  }

  if (cleanedFilter.ward) {
    query.ward = { $regex: new RegExp(`^${escapeRegex(cleanedFilter.ward)}$`, 'i') };
  }

  if (cleanedFilter.pollingUnit) {
    query.pollingUnit = { $regex: new RegExp(`^${escapeRegex(cleanedFilter.pollingUnit)}$`, 'i') };
  }

  // Find target recipients
  const recipients = await User.find(query).select('_id name expoPushToken');

  // Compute effective targetAudience label
  let effectiveAudience = audience;
  if (cleanedFilter.pollingUnit) {
    effectiveAudience = 'pollingUnit';
  } else if (cleanedFilter.ward) {
    effectiveAudience = 'ward';
  } else if (cleanedFilter.localGovt) {
    effectiveAudience = 'localGovt';
  }

  // Save the broadcast record
  const broadcast = await Broadcast.create({
    senderId: req.user._id,
    senderName: req.user.name || 'AkureClean Admin',
    title: title.trim(),
    message: message.trim(),
    priority: priority || 'normal',
    targetAudience: effectiveAudience,
    targetFilter: cleanedFilter,
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

  // Build human-readable filter description for audit log
  const filterDesc = [
    cleanedFilter.localGovt ? `LGA: ${cleanedFilter.localGovt}` : null,
    cleanedFilter.ward ? `Ward: ${cleanedFilter.ward}` : null,
    cleanedFilter.pollingUnit ? `PU: ${cleanedFilter.pollingUnit}` : null,
  ].filter(Boolean).join(' | ');

  await ActivityLog.create({
    user: req.user._id,
    action: 'Create Broadcast',
    description: `Admin sent broadcast "${title.trim()}" to ${recipients.length} recipients${filterDesc ? ` (${filterDesc})` : ' (City-wide)'}`,
    details: {
      broadcastId: broadcast._id,
      recipientsCount: recipients.length,
      audience: effectiveAudience,
      priority: priority || 'normal',
      targetFilter: cleanedFilter,
    },
  }).catch((err) => console.error('[ActivityLog Error]:', err.message));

  res.status(201).json({
    success: true,
    message: `Broadcast successfully dispatched to ${recipients.length} resident(s)${filterDesc ? ` in ${filterDesc}` : ''}`,
    data: broadcast,
  });
});

/**
 * @desc    Get all broadcasts
 * @route   GET /api/broadcasts
 * @access  Private
 */
exports.getBroadcasts = asyncHandler(async (req, res) => {
  const query = buildResidentBroadcastQuery(req.user);

  const broadcasts = await Broadcast.find(query)
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
  const query = buildResidentBroadcastQuery(req.user);

  const latest = await Broadcast.findOne(query)
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
