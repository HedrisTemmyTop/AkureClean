const mongoose = require('mongoose');

const billSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  year: {
    type: Number,
    required: true,
  },
  month: {
    type: Number,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ['unpaid', 'paid'],
    default: 'unpaid',
  },
  paystackReference: {
    type: String,
    default: null,
  },
  paidAt: {
    type: Date,
    default: null,
  }
}, { timestamps: true });

// Basic index for performance
billSchema.index({ userId: 1, status: 1 });

const Bill = mongoose.model('Bill', billSchema);
module.exports = Bill;
