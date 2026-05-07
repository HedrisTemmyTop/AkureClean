const mongoose = require('mongoose');

/**
 * Report model — represents a resident's waste pickup request.
 * This supersedes the old `PickupRequest` model for the client-facing flow.
 * Statuses mirror the client's `RequestStatus` TypeScript type exactly.
 */
const reportSchema = new mongoose.Schema({
  residentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // Assigned driver
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  // The assignment (route) this report is attached to, once scheduled
  assignmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assignment',
    default: null,
  },
  // Location fields
  street: {
    type: String,
    required: true,
  },
  landmark: {
    type: String,
  },
  lga: {
    type: String,
  },
  ward: {
    type: String,
  },
  // GeoJSON Point from resident's registered location or manual pin
  location: {
    type: {
      type: String,
      enum: ['Point'],
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
    },
  },
  // Waste details
  type: {
    type: String,
    enum: ['General', 'Recyclables', 'Hazardous', 'Bulky'],
    default: 'General',
  },
  severity: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium',
  },
  notes: {
    type: String,
  },
  imageUrl: {
    type: String,
    default: null,
  },
  preferredDate: {
    type: Date,
    default: null,
  },
  // Status mirrors client RequestStatus type
  status: {
    type: String,
    enum: ['Pending', 'Payment Pending', 'Scheduled', 'In Progress', 'Completed', 'Cancelled', 'Declined'],
    default: 'Pending',
  },
  // Payment
  cost: {
    type: Number,
    default: 0,
  },
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'paid'],
    default: 'unpaid',
  },
  paystackReference: {
    type: String,
    default: null,
  },
  // Timestamps
  requestedDate: {
    type: Date,
    default: Date.now,
  },
  completedDate: {
    type: Date,
    default: null,
  },
}, { timestamps: true });

reportSchema.index({ location: '2dsphere' });
reportSchema.index({ residentId: 1, status: 1 });

const Report = mongoose.model('Report', reportSchema);
module.exports = Report;
