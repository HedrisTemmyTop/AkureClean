const express = require('express');
const router = express.Router();
const broadcastController = require('../controllers/broadcast');
const protect = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');

// All broadcast routes require authentication
router.use(protect);

router.get('/latest', broadcastController.getLatestBroadcast);
router.get('/', broadcastController.getBroadcasts);
router.get('/:id', broadcastController.getBroadcastById);

// Admin-only routes
router.post('/', roleGuard('admin'), broadcastController.createBroadcast);
router.delete('/:id', roleGuard('admin'), broadcastController.deleteBroadcast);

module.exports = router;
