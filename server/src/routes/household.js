const express = require('express');
const { check } = require('express-validator');
const householdController = require('../controllers/household');
const protect = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');

const router = express.Router();

router.use(protect);

/**
 * @swagger
 * /api/household:
 *   post:
 *     summary: Create a household
 *     tags: [Household]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - address
 *               - coordinates
 *               - zoneId
 *             properties:
 *               address:
 *                 type: string
 *               coordinates:
 *                 type: object
 *                 properties:
 *                   lat:
 *                     type: number
 *                   lng:
 *                     type: number
 *               zoneId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Household created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthenticated
 *       403:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
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

/**
 * @swagger
 * /api/household/{id}:
 *   put:
 *     summary: Update a household
 *     tags: [Household]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Household ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               coordinates:
 *                 type: object
 *                 properties:
 *                   lat:
 *                     type: number
 *                   lng:
 *                     type: number
 *               zoneId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Household updated
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
router.put('/:id',
  roleGuard('resident', 'admin'),
  [
    check('coordinates.lat').optional().isNumeric(),
    check('coordinates.lng').optional().isNumeric(),
    check('zoneId').optional().isMongoId()
  ],
  householdController.updateHousehold
);

/**
 * @swagger
 * /api/household/mine:
 *   get:
 *     summary: Get my household
 *     tags: [Household]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Household details
 *       401:
 *         description: Unauthenticated
 *       403:
 *         description: Unauthorized
 *       404:
 *         description: Not found
 *       500:
 *         description: Server error
 */
router.get('/mine', roleGuard('resident'), householdController.getMyHousehold);

module.exports = router;
