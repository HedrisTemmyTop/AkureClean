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
    enum: ['StatusUpdate', 'Reminder', 'System'],
    default: 'System',
  },
  read: {
    type: Boolean,
    default: false,
  },
  // Optional link back to a report or assignment
  relatedId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  relatedModel: {
    type: String,
    enum: ['Report', 'Assignment', 'PickupRequest', null],
    default: null,
  },
}, { timestamps: true });

notificationSchema.index({ userId: 1, read: 1 });

const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification;
