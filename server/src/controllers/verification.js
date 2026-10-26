const Assignment = require('../models/Assignment');
const PickupRequest = require('../models/PickupRequest');
const Report = require('../models/Report');
const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');
const { logActivity } = require('../utils/logger');
const { uploadImage } = require('../services/imageUpload');
const { isReviewable, isNoResponseWindowOpen } = require('../utils/verification');

const OPEN_STATUSES = ['AwaitingResident', 'ResidentConfirmed', 'Disputed'];

/* -------------------------------------------------------------------------- */
/* Helpers (also used by the driver/assignment/pickup controllers)            */
/* -------------------------------------------------------------------------- */

/** Put a freshly-collected stop into the verification flow and notify the resident. */
exports.startStopVerification = async (assignment, stop) => {
  stop.verificationStatus = 'AwaitingResident';
  if (stop.userId) {
    await Notification.create({
      userId: stop.userId,
      title: 'Please confirm your collection',
      message: `The driver marked your household (${stop.address}) as collected. Please confirm that your waste was collected.`,
      type: 'StatusUpdate',
      relatedId: assignment._id,
      relatedModel: 'Assignment',
    });
  }
};

const notifyPickupResident = (pickup, title, message) =>
  Notification.create({
    userId: pickup.userId._id || pickup.userId,
    title,
    message,
    type: 'StatusUpdate',
    relatedId: pickup._id,
    relatedModel: 'PickupRequest',
  });
exports.notifyPickupResident = notifyPickupResident;

const stopItem = (assignment, stop) => ({
  kind: 'stop',
  id: stop._id,
  assignmentId: assignment._id,
  assignmentTitle: assignment.title,
  address: stop.address,
  ward: stop.ward,
  pollingUnit: stop.pollingUnit,
  wasteType: stop.wasteType,
  collectedAt: stop.collectedAt,
  collectionDate: assignment.collectionDate,
  driver: assignment.driverId && assignment.driverId.name
    ? { name: assignment.driverId.name, phone: assignment.driverId.phone }
    : null,
  resident: stop.userId && stop.userId.name
    ? { name: stop.userId.name, phone: stop.userId.phone, address: stop.userId.address }
    : null,
  verificationStatus: stop.verificationStatus,
  residentConfirmedAt: stop.residentConfirmedAt,
  residentNote: stop.residentNote,
  residentImage: stop.residentImage,
  adminNote: stop.adminNote,
  noResponse: stop.verificationStatus === 'AwaitingResident'
    && isNoResponseWindowOpen(assignment.collectionDate),
  canReview: isReviewable(stop.verificationStatus, assignment.collectionDate),
});

const pickupItem = (p) => ({
  kind: 'pickup',
  id: p._id,
  assignmentId: null,
  assignmentTitle: 'Requested pickup',
  address: p.address,
  ward: p.ward,
  pollingUnit: p.pollingUnit,
  wasteType: p.type,
  collectedAt: p.collectedAt,
  collectionDate: p.scheduledDate || p.createdAt,
  driver: p.driverId && p.driverId.name
    ? { name: p.driverId.name, phone: p.driverId.phone }
    : null,
  resident: p.userId && p.userId.name
    ? { name: p.userId.name, phone: p.userId.phone, address: p.userId.address }
    : null,
  verificationStatus: p.verificationStatus,
  residentConfirmedAt: p.residentConfirmedAt,
  residentNote: p.residentNote,
  residentImage: p.residentImage,
  adminNote: p.adminNote,
  noResponse: p.verificationStatus === 'AwaitingResident'
    && isNoResponseWindowOpen(p.scheduledDate || p.createdAt),
  canReview: isReviewable(p.verificationStatus, p.scheduledDate || p.createdAt),
});

/* -------------------------------------------------------------------------- */
/* Resident                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * @route GET /api/verification/resident/pending
 * Collections the resident still needs to confirm.
 */
exports.getResidentPending = asyncHandler(async (req, res) => {
  const [assignments, pickups] = await Promise.all([
    Assignment.find({
      stops: { $elemMatch: { userId: req.user._id, verificationStatus: 'AwaitingResident' } },
    }).populate('driverId', 'name phone'),
    PickupRequest.find({ userId: req.user._id, verificationStatus: 'AwaitingResident' })
      .populate('driverId', 'name phone'),
  ]);

  const items = [];
  assignments.forEach((a) =>
    a.stops
      .filter((s) => s.userId && s.userId.toString() === req.user._id.toString()
        && s.verificationStatus === 'AwaitingResident')
      .forEach((s) => items.push(stopItem(a, s))),
  );
  pickups.forEach((p) => items.push(pickupItem(p)));

  items.sort((a, b) => new Date(b.collectedAt) - new Date(a.collectedAt));
  res.json({ success: true, data: items });
});

const residentRespond = (decision) => asyncHandler(async (req, res) => {
  const { kind } = req.params;
  const { note, image } = req.body;

  if (decision === 'dispute' && (!note || !note.trim())) {
    return res.status(400).json({ success: false, message: 'Please tell us what went wrong.' });
  }

  const imageUrl = decision === 'dispute' ? await uploadImage(image, 'smartenv/disputes') : null;

  let target; // the stop or pickup document
  let save;
  if (kind === 'stop') {
    const assignment = await Assignment.findById(req.params.assignmentId);
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });
    target = assignment.stops.id(req.params.id);
    if (!target || !target.userId || target.userId.toString() !== req.user._id.toString()) {
      return res.status(404).json({ success: false, message: 'Collection not found' });
    }
    save = () => assignment.save();
  } else {
    target = await PickupRequest.findOne({ _id: req.params.id, userId: req.user._id });
    if (!target) return res.status(404).json({ success: false, message: 'Collection not found' });
    save = () => target.save();
  }

  if (target.verificationStatus !== 'AwaitingResident') {
    return res.status(400).json({ success: false, message: 'This collection is not awaiting your confirmation.' });
  }

  target.verificationStatus = decision === 'confirm' ? 'ResidentConfirmed' : 'Disputed';
  target.residentConfirmedAt = new Date();
  target.residentNote = note || null;
  if (imageUrl) target.residentImage = imageUrl;
  await save();

  await logActivity(
    req.user._id,
    decision === 'confirm' ? 'Confirm Collection' : 'Dispute Collection',
    `${decision === 'confirm' ? 'Confirmed' : 'Disputed'} a ${kind} collection`,
  );

  res.json({ success: true, message: 'Thank you, your response was recorded.' });
});

exports.confirmCollection = residentRespond('confirm');
exports.disputeCollection = residentRespond('dispute');

/* -------------------------------------------------------------------------- */
/* Admin                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * @route GET /api/verification/admin/pending
 * All open collections. `canReview` tells the client whether Approve/Reject is enabled
 * (resident responded, or the no-response window has opened).
 */
exports.getAdminPending = asyncHandler(async (req, res) => {
  const [assignments, pickups] = await Promise.all([
    Assignment.find({ 'stops.verificationStatus': { $in: OPEN_STATUSES } })
      .populate('driverId', 'name phone')
      .populate('stops.userId', 'name phone address'),
    PickupRequest.find({ verificationStatus: { $in: OPEN_STATUSES } })
      .populate('driverId', 'name phone')
      .populate('userId', 'name phone address'),
  ]);

  const items = [];
  assignments.forEach((a) =>
    a.stops
      .filter((s) => OPEN_STATUSES.includes(s.verificationStatus))
      .forEach((s) => items.push(stopItem(a, s))),
  );
  pickups.forEach((p) => items.push(pickupItem(p)));

  items.sort((a, b) => new Date(b.collectedAt) - new Date(a.collectedAt));
  res.json({ success: true, data: items });
});

exports.reviewCollection = asyncHandler(async (req, res) => {
  const { kind } = req.params;
  const { decision, note } = req.body;

  if (!['approve', 'reject'].includes(decision)) {
    return res.status(400).json({ success: false, message: "Decision must be 'approve' or 'reject'" });
  }
  if (decision === 'reject' && (!note || !note.trim())) {
    return res.status(400).json({ success: false, message: 'A note is required when rejecting.' });
  }

  const approved = decision === 'approve';

  if (kind === 'stop') {
    const assignment = await Assignment.findById(req.params.assignmentId);
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });
    const stop = assignment.stops.id(req.params.id);
    if (!stop) return res.status(404).json({ success: false, message: 'Stop not found' });

    stop.verificationStatus = approved ? 'Approved' : 'Rejected';
    if (approved) {
      stop.status = 'Completed';
      if (!stop.collectedAt) stop.collectedAt = new Date();
    }
    stop.adminReviewedBy = req.user._id;
    stop.adminReviewedAt = new Date();
    stop.adminNote = note || null;
    await assignment.save();

    if (approved && stop.reportId) {
      await Report.findByIdAndUpdate(stop.reportId, { status: 'Completed', completedDate: new Date() });
    }
    if (stop.userId) {
      await Notification.create({
        userId: stop.userId,
        title: approved ? 'Collection approved' : 'Collection not approved',
        message: approved
          ? `Your collection at ${stop.address} has been verified.`
          : `Your collection at ${stop.address} was not approved by the admin. ${note || ''}`,
        type: 'StatusUpdate',
        relatedId: assignment._id,
        relatedModel: 'Assignment',
      });
    }
  } else {
    const pickup = await PickupRequest.findById(req.params.id);
    if (!pickup) return res.status(404).json({ success: false, message: 'Pickup not found' });

    pickup.verificationStatus = approved ? 'Approved' : 'Rejected';
    pickup.status = approved ? 'completed' : 'rejected';
    pickup.adminReviewedBy = req.user._id;
    pickup.adminReviewedAt = new Date();
    pickup.adminNote = note || null;
    await pickup.save();

    await notifyPickupResident(
      pickup,
      approved ? 'Pickup approved' : 'Pickup not approved',
      approved
        ? 'Your requested pickup has been verified and completed.'
        : `Your pickup was not approved by the admin. ${note}`,
    );
  }

  await logActivity(
    req.user._id,
    approved ? 'Approve Collection' : 'Reject Collection',
    `${approved ? 'Approved' : 'Rejected'} a ${kind} collection`,
  );

  res.json({ success: true, message: approved ? 'Collection approved' : 'Collection rejected' });
});
