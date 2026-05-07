const mongoose = require('mongoose');

/**
 * Schedule model — maps to the client's `CollectionSchedule` TypeScript type.
 * Defines recurring collection days per zone/ward.
 */
const scheduleSchema = new mongoose.Schema({
  zoneId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Zone',
    required: true,
  },
  lga: {
    type: String,
  },
  ward: {
    type: String,
  },
  dayOfWeek: {
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    required: true,
  },
  nextPickup: {
    type: Date,
    required: true,
  },
}, { timestamps: true });

const Schedule = mongoose.model('Schedule', scheduleSchema);
module.exports = Schedule;
