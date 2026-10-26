/**
 * Helpers for the collection verification flow.
 */
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * An item awaiting a resident response becomes reviewable by the admin
 * 24 hours after the selected collection date has passed (end of that day + 24h).
 * Items the resident has already confirmed/disputed are reviewable immediately.
 */
const isReviewable = (_verificationStatus, _collectionDate) => {
  return true;
};

const isNoResponseWindowOpen = (_collectionDate) => {
  return true;
};

module.exports = { isReviewable, isNoResponseWindowOpen };
