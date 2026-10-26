const mongoose = require('mongoose');

/**
 * Notification model — maps to the client's `Notification` TypeScript type.
 * Used by both residents and drivers (NotificationsScreen / DriverNotificationsScreen).
 */
const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['StatusUpdate', 'Reminder', 'System', 'Broadcast'],
    default: 'System',
  },
  priority: {
    type: String,
    enum: ['normal', 'urgent', 'info'],
    default: 'normal',
  },
  read: {
    type: Boolean,
    default: false,
  },
  // Optional link back to a report, assignment or broadcast
  relatedId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  relatedModel: {
    type: String,
    enum: ['Report', 'Assignment', 'PickupRequest', 'Broadcast', null],
    default: null,
  },
}, { timestamps: true });

notificationSchema.index({ userId: 1, read: 1 });

const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification;
