const mongoose = require('mongoose');

const collectionLogSchema = new mongoose.Schema({
  zoneId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Zone',
    required: true,
  },
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  route: [{
    householdId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Household',
      required: true,
    },
    coordinates: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true }
    },
    collectedAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['pending', 'collected'],
      default: 'pending',
    }
  }],
  status: {
    type: String,
    enum: ['in_progress', 'completed'],
    default: 'in_progress',
  },
  startedAt: {
    type: Date,
    default: Date.now,
  },
  completedAt: {
    type: Date,
    default: null,
  }
}, { timestamps: true });

const CollectionLog = mongoose.model('CollectionLog', collectionLogSchema);
module.exports = CollectionLog;
