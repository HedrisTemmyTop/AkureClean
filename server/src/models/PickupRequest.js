const mongoose = require('mongoose');

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
  address: String,
  localGovt: String,
  ward: String,
  pollingUnit: String,
  scheduledDate: String,
  scheduledTime: String,
  status: {
    type: String,
    enum: ['pending', 'accepted', 'completed', 'cancelled'],
    default: 'pending',
  },
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  extraFee: {
    type: Number,
    required: true,
  }
}, { timestamps: true });

const PickupRequest = mongoose.model('PickupRequest', pickupRequestSchema);
module.exports = PickupRequest;
