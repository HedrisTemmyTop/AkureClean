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
/**
 * @swagger
 * /api/pickup/verify:
 *   post:
 *     summary: Webhook verify
 *     tags: [Pickup]
 *     responses:
 *       200:
 *         description: Webhook received
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server error
 */
router.post('/verify', billController.verifyWebhook);

router.use(protect);

/**
 * @swagger
 * /api/pickup:
 *   post:
 *     summary: Create a pickup request
 *     tags: [Pickup]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *             properties:
 *               type:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Pickup created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthenticated
 *       403:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/all', roleGuard('admin'), pickupController.getAllPickups);
router.get('/', roleGuard('driver'), pickupController.getAllAvailablePickups);
router.post('/', roleGuard('resident'), pickupController.createPickupRequest);
router.post('/:id/cancel', roleGuard('resident'), pickupController.cancelPickup);
router.post('/:id/complete', roleGuard('resident'), pickupController.completePickupByResident);
/**
 * @swagger
 * /api/pickup/{id}/pay:
 *   post:
 *     summary: Pay for a pickup
 *     tags: [Pickup]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment initialized
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthenticated
 *       403:
 *         description: Unauthorized
 *       404:
 *         description: Not found
 *       500:
 *         description: Server error
 */
// pay route removed as payment is physical

/**
 * @swagger
 * /api/pickup/mine:
 *   get:
 *     summary: Get my pickup requests
 *     tags: [Pickup]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of my pickup requests
 *       401:
 *         description: Unauthenticated
 *       403:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/mine', roleGuard('resident'), pickupController.getMyPickups);

/**
 * @swagger
 * /api/pickup/driver:
 *   get:
 *     summary: Get driver pickups
 *     tags: [Pickup]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pickups
 *       401:
 *         description: Unauthenticated
 *       403:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/driver', roleGuard('driver'), pickupController.getDriverPickups);
router.get('/collector/:id', roleGuard('admin'), pickupController.getCollectorPickups);
router.get('/:id', pickupController.getPickupById);
/**
 * @swagger
 * /api/pickup/{id}/respond:
 *   put:
 *     summary: Respond to a pickup
 *     tags: [Pickup]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Responded
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthenticated
 *       403:
 *         description: Unauthorized
 *       404:
 *         description: Not found
 *       500:
 *         description: Server error
 */
router.put('/:id/respond', roleGuard('driver'), pickupController.respondToPickup);

module.exports = router;
