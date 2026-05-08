const mongoose = require('mongoose');

/**
 * Assignment model — maps to the client's `AssignmentRoute` TypeScript type.
 * Created by Admin; consumed by Drivers via their dashboard and route screen.
 */
const stopSchema = new mongoose.Schema({
  reportId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Report',
    default: null,
  },
  householdId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Household',
    default: null,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  address:     { type: String, required: true },
  street:      { type: String },
  ward:        { type: String },
  lga:         { type: String },
  pollingUnit: { type: String },
  landmark:{ type: String },
  // GeoJSON Point
  location: {
    type: { type: String, enum: ['Point'] },
    coordinates: { type: [Number] },
  },
  wasteType: {
    type: String,
    enum: ['General', 'Recyclables', 'Hazardous', 'Bulky'],
    default: 'General',
  },
  severity: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium',
  },
  status: {
    type: String,
    enum: ['Pending', 'Completed', 'Skipped'],
    default: 'Pending',
  },
  skipReason: { type: String, default: null },
  residentNote: { type: String },
  collectionNote: { type: String },
  reportsCount: { type: Number, default: 1 },
  collectedAt: { type: Date, default: null },
}, { _id: true });

const assignmentSchema = new mongoose.Schema({
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  zoneId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Zone',
    default: null,
  },
  title: {
    type: String,
    required: true,
  },
  area: {
    type: String,
    required: true,
  },
  collectionDate: {
    type: Date,
    required: true,
  },
  collectionTime: {
    type: String,
    required: true,
  },
  estimatedDistance: { type: String }, // e.g. "12 km"
  estimatedDuration: { type: String }, // e.g. "2 hours"
  actualDuration:    { type: String },
  stops: [stopSchema],
  status: {
    type: String,
    enum: ['Pending', 'InProgress', 'Paused', 'Completed'],
    default: 'Pending',
  },
  optimizedRoute: {
    type: [Number],
    default: [],
  },
}, { timestamps: true });

const Assignment = mongoose.model('Assignment', assignmentSchema);
module.exports = Assignment;
