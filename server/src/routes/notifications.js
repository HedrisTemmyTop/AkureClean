const express = require('express');
const notificationController = require('../controllers/notification');
const protect = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/', notificationController.getNotifications);
router.get('/unread-count', notificationController.getUnreadCount);
router.patch('/mark-all-read', notificationController.markAllAsRead);
router.patch('/:id/read', notificationController.markAsRead);

module.exports = router;
