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

// Unique constraint: one bill per userId per year
billSchema.index({ userId: 1, year: 1 }, { unique: true });

const Bill = mongoose.model('Bill', billSchema);
module.exports = Bill;
