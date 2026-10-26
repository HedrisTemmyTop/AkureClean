/**
 * Shared verification fields used by Assignment stops and PickupRequests.
 *
 * Lifecycle:
 *   None -> AwaitingResident -> ResidentConfirmed | Disputed -> Approved | Rejected
 */
const mongoose = require('mongoose');

const VERIFICATION_STATUSES = [
  'None',
  'AwaitingResident',
  'ResidentConfirmed',
  'Disputed',
  'Approved',
  'Rejected',
];

const verificationFields = {
  verificationStatus: {
    type: String,
    enum: VERIFICATION_STATUSES,
    default: 'None',
  },
  residentConfirmedAt: { type: Date, default: null },
  residentNote: { type: String, default: null },
  residentImage: { type: String, default: null }, // image URL (Cloudinary)
  adminReviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  adminReviewedAt: { type: Date, default: null },
  adminNote: { type: String, default: null },
};

module.exports = { verificationFields, VERIFICATION_STATUSES };
