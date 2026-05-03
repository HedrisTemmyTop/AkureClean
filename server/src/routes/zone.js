const express = require('express');
const { check } = require('express-validator');
const zoneController = require('../controllers/zone');
const protect = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');

const router = express.Router();

router.use(protect);
router.use(roleGuard('admin'));

router.post('/', 
  [
    check('name', 'Zone name is required').notEmpty()
  ], 
  zoneController.createZone
);

router.get('/', zoneController.getZones);

router.put('/:id/assign', zoneController.assignDriver);

module.exports = router;
