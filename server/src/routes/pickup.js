const express = require('express');
const pickupController = require('../controllers/pickup');
const protect = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');

const router = express.Router();

// Webhook handled in bill.js or needs to be routed here. Let's handle it in bill.js as it's a generic paystack webhook.
// Wait, the instructions say: `POST /api/pickup/verify -> Paystack webhook for pickup payment`
// I already handled it in bill.js for both but let's mount it here as well if needed. Actually, paystack uses ONE webhook URL. So we will point it to /api/bills/verify. We can ignore /api/pickup/verify or point it to the same verify handler.
// I will just point it to the bill webhook for simplicity or import the same controller.

const billController = require('../controllers/bill');
router.post('/verify', billController.verifyWebhook);

router.use(protect);

router.post('/', roleGuard('resident'), pickupController.createPickupRequest);
router.post('/:id/pay', roleGuard('resident'), pickupController.payPickupFee);

router.get('/driver', roleGuard('driver'), pickupController.getDriverPickups);
router.put('/:id/respond', roleGuard('driver'), pickupController.respondToPickup);

module.exports = router;
