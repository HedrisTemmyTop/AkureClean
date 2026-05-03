const express = require('express');
const routeController = require('../controllers/route');
const protect = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');

const router = express.Router();

router.use(protect);
router.use(roleGuard('admin'));

router.post('/generate/:zoneId', routeController.generateRoute);

module.exports = router;
