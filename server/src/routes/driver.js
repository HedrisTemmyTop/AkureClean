const express = require('express');
const driverController = require('../controllers/driver');
const protect = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');

const router = express.Router();

router.use(protect);
router.use(roleGuard('driver'));

router.get('/route', driverController.getMyRoute);
router.put('/collect/:householdId', driverController.collectHousehold);

module.exports = router;
