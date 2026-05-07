const express = require('express');
const billController = require('../controllers/bill');
const protect = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');

const router = express.Router();

// Webhook doesn't need auth, paystack signature validation handles it
/**
 * @swagger
 * /api/bills/verify:
 *   post:
 *     summary: Paystack webhook verification
 *     tags: [Bill]
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
 * /api/bills/mine:
 *   get:
 *     summary: Get my bills
 *     tags: [Bill]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of bills
 *       401:
 *         description: Unauthenticated
 *       403:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/mine', roleGuard('resident'), billController.getMyBills);
/**
 * @swagger
 * /api/bills/pay:
 *   post:
 *     summary: Pay a bill
 *     tags: [Bill]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - billId
 *             properties:
 *               billId:
 *                 type: string
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
router.post('/pay', roleGuard('resident'), billController.payBill);

module.exports = router;
