const express = require('express');
const adminController = require('../controllers/admin');
const protect = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');

const router = express.Router();

router.use(protect);
router.use(roleGuard('admin'));

router.get('/logs', adminController.getAllLogs);
router.get('/users', adminController.getAllUsers);

module.exports = router;
