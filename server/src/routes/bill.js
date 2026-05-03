const express = require('express');
const billController = require('../controllers/bill');
const protect = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');

const router = express.Router();

// Webhook doesn't need auth, paystack signature validation handles it
router.post('/verify', billController.verifyWebhook);

router.use(protect);

router.get('/mine', roleGuard('resident'), billController.getMyBills);
router.post('/pay', roleGuard('resident'), billController.payBill);

module.exports = router;
