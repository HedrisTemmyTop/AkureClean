const express = require('express');
const controller = require('../controllers/verification');
const protect = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');

const router = express.Router();

router.use(protect);

// Resident
router.get('/resident/pending', roleGuard('resident'), controller.getResidentPending);
router.post('/stop/:assignmentId/:id/confirm', roleGuard('resident'), (req, res, next) => {
  req.params.kind = 'stop';
  controller.confirmCollection(req, res, next);
});
router.post('/stop/:assignmentId/:id/dispute', roleGuard('resident'), (req, res, next) => {
  req.params.kind = 'stop';
  controller.disputeCollection(req, res, next);
});
router.post('/pickup/:id/confirm', roleGuard('resident'), (req, res, next) => {
  req.params.kind = 'pickup';
  controller.confirmCollection(req, res, next);
});
router.post('/pickup/:id/dispute', roleGuard('resident'), (req, res, next) => {
  req.params.kind = 'pickup';
  controller.disputeCollection(req, res, next);
});

// Admin
router.get('/admin/pending', roleGuard('admin'), controller.getAdminPending);
router.post('/stop/:assignmentId/:id/review', roleGuard('admin'), (req, res, next) => {
  req.params.kind = 'stop';
  controller.reviewCollection(req, res, next);
});
router.post('/pickup/:id/review', roleGuard('admin'), (req, res, next) => {
  req.params.kind = 'pickup';
  controller.reviewCollection(req, res, next);
});

module.exports = router;
