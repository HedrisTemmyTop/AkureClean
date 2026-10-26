const mongoose = require("mongoose");

const availabilitySlotSchema = new mongoose.Schema(
  {
    weekNumber: {
      type: Number,
      required: true,
    },
    weekStart: {
      type: String,
      required: true, // YYYY-MM-DD
    },
    weekEnd: {
      type: String,
      required: true, // YYYY-MM-DD
    },
    date: {
      type: String,
      required: true, // YYYY-MM-DD
    },
    dayOfWeek: {
      type: String,
      required: true, // Monday, Tuesday, ...
    },
    timeSlot: {
      type: String,
      default: "08:00 AM",
    },
  },
  { _id: false }
);

const driverAvailabilitySchema = new mongoose.Schema(
  {
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    year: {
      type: Number,
      required: true,
    },
    month: {
      type: Number,
      required: true, // 1 - 12
    },
    monthKey: {
      type: String,
      required: true, // "YYYY-MM"
    },
    slots: {
      type: [availabilitySlotSchema],
      default: [],
    },
    availableDates: {
      type: [String], // ["YYYY-MM-DD"]
      default: [],
    },
    notes: {
      type: String,
      default: "",
    },
    // pending: submitted by the driver, awaiting admin approval (driver can still edit)
    // approved: locked for the driver and visible to residents
    // rejected: rejected by admin with a reason, driver can edit and resubmit
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      default: null,
    },
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    rejectedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

driverAvailabilitySchema.index({ driverId: 1, monthKey: 1 }, { unique: true });

const DriverAvailability = mongoose.model(
  "DriverAvailability",
  driverAvailabilitySchema
);

module.exports = DriverAvailability;
