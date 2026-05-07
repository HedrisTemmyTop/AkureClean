const mongoose = require('mongoose');

const householdSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  address: {
    type: String,
    required: true,
  },
  houseDescription: {
    type: String,
  },
  localGovt: {
    type: String,
  },
  ward: {
    type: String,
  },
  pollingUnit: {
    type: String,
  },
  // GeoJSON Point: { type: "Point", coordinates: [lng, lat] }
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
    },
  },
  zoneId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Zone',
    default: null,
  },
}, { timestamps: true });

householdSchema.index({ location: '2dsphere' });

const Household = mongoose.model('Household', householdSchema);
module.exports = Household;
