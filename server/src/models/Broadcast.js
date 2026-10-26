const mongoose = require('mongoose');

/**
 * Broadcast model — records messages sent by administrators to residents or target groups.
 */
const broadcastSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    senderName: {
      type: String,
      default: 'AkureClean Admin',
    },
    title: {
      type: String,
      required: [true, 'Broadcast title is required'],
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'Broadcast message content is required'],
      trim: true,
    },
    priority: {
      type: String,
      enum: ['normal', 'urgent', 'info'],
      default: 'normal',
    },
    targetAudience: {
      type: String,
      enum: ['all_residents', 'all_users', 'ward', 'pollingUnit', 'drivers'],
      default: 'all_residents',
    },
    targetFilter: {
      localGovt: { type: String, default: null },
      ward: { type: String, default: null },
      pollingUnit: { type: String, default: null },
    },
    recipientsCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

broadcastSchema.index({ createdAt: -1 });

const Broadcast = mongoose.model('Broadcast', broadcastSchema);
module.exports = Broadcast;
