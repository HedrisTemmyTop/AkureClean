const express = require('express');
const { check } = require('express-validator');
const authController = require('../controllers/auth');
const protect = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *               - phone
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       201:
 *         description: Created successfully
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server error
 */
router.post('/register', [
  check('name', 'Name is required').notEmpty(),
  check('email', 'Please include a valid email').isEmail(),
  check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 }),
  check('phone', 'Phone number is required').notEmpty()
], authController.register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login a user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Logged in successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthenticated
 *       500:
 *         description: Server error
 */
router.post('/login', [
  check('email', 'Please include a valid email').isEmail(),
  check('password', 'Password is required').exists()
], authController.login);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token refreshed
 *       401:
 *         description: Unauthenticated
 *       500:
 *         description: Server error
 */
router.post('/refresh', authController.refresh);

// Protected profile routes
/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile data
 *       401:
 *         description: Unauthenticated
 *       500:
 *         description: Server error
 */
router.get('/me', protect, authController.getMe);
/**
 * @swagger
 * /api/auth/me:
 *   patch:
 *     summary: Update current user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated
 *       401:
 *         description: Unauthenticated
 *       500:
 *         description: Server error
 */
router.patch('/me', protect, authController.updateMe);

/**
 * @swagger
 * /api/auth/push-token:
 *   patch:
 *     summary: Update expo push token
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - expoPushToken
 *             properties:
 *               expoPushToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token updated
 *       401:
 *         description: Unauthenticated
 *       500:
 *         description: Server error
 */
router.patch('/push-token', protect, authController.updatePushToken);
router.patch('/deactivate', protect, authController.deactivateMe);
router.delete('/me', protect, authController.deleteMe);

module.exports = router;
