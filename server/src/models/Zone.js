const mongoose = require('mongoose');

const zoneSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  boundary: {
    type: {
      type: String,
      enum: ['Polygon'],
      required: true
    },
    coordinates: {
      type: [[[Number]]], // Array of arrays of arrays of numbers: [ [ [lng, lat], [lng, lat] ] ]
      required: true
    }
  },
  assignedDriverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  }
}, { timestamps: true });

zoneSchema.index({ boundary: '2dsphere' });

const Zone = mongoose.model('Zone', zoneSchema);
module.exports = Zone;
