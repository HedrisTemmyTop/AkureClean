const mongoose = require('mongoose');
const { verificationFields } = require('./verificationFields');

/**
 * Status lifecycle:
 *   pending   -> resident created, waiting for a driver on that route
 *   accepted  -> driver accepted (drivers may hold several at once)
 *   collected -> driver marked collected, awaiting resident confirm + admin approval
 *   completed -> admin approved
 *   rejected  -> driver could not collect, or admin rejected the collection
 *   cancelled -> resident cancelled while pending
 */
const pickupRequestSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  householdId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Household',
    default: null,
  },
  type: {
    type: String,
    enum: ['General', 'Recyclables', 'Hazardous', 'Bulky'],
    default: 'General',
  },
  notes: {
    type: String,
    default: '',
  },
  image: {
    type: String,
    default: null,
  },
  address: String,
  localGovt: String,
  ward: String,
  pollingUnit: String,
  scheduledDate: String,
  scheduledTime: String,
  status: {
    type: String,
    enum: ['pending', 'accepted', 'collected', 'completed', 'rejected', 'cancelled'],
    default: 'pending',
  },
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  acceptedAt: { type: Date, default: null },
  collectedAt: { type: Date, default: null },
  driverRejectReason: { type: String, default: null },
  extraFee: {
    type: Number,
    default: 0,
  },
  ...verificationFields,
}, { timestamps: true });

const PickupRequest = mongoose.model('PickupRequest', pickupRequestSchema);
module.exports = PickupRequest;
