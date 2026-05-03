const mongoose = require('mongoose');

const zoneSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  streets: [{
    type: String,
  }],
  assignedDriverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  }
}, { timestamps: true });

const Zone = mongoose.model('Zone', zoneSchema);
module.exports = Zone;
