const express = require('express');
const { check } = require('express-validator');
const householdController = require('../controllers/household');
const protect = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');

const router = express.Router();

router.use(protect);

router.post('/', 
  roleGuard('resident'),
  [
    check('address', 'Address is required').notEmpty(),
    check('coordinates.lat', 'Latitude is required').isNumeric(),
    check('coordinates.lng', 'Longitude is required').isNumeric(),
    check('zoneId', 'Zone ID is required').isMongoId()
  ], 
  householdController.createHousehold
);

router.put('/:id',
  roleGuard('resident', 'admin'),
  [
    check('coordinates.lat').optional().isNumeric(),
    check('coordinates.lng').optional().isNumeric(),
    check('zoneId').optional().isMongoId()
  ],
  householdController.updateHousehold
);

router.get('/mine', roleGuard('resident'), householdController.getMyHousehold);

module.exports = router;
