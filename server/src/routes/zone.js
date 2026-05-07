const express = require("express");
const { check } = require("express-validator");
const zoneController = require("../controllers/zone");
const protect = require("../middleware/auth");
const roleGuard = require("../middleware/roleGuard");

const router = express.Router();

router.use(protect);
router.use(roleGuard("admin"));

/**
 * @swagger
 * /api/zones:
 *   post:
 *     summary: Create a new zone
 *     tags: [Zone]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Zone created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthenticated
 *       403:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post(
  "/",
  [check("name", "Zone name is required").notEmpty()],
  zoneController.createZone,
);

/**
 * @swagger
 * /api/zones:
 *   get:
 *     summary: Get all zones
 *     tags: [Zone]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of zones
 *       401:
 *         description: Unauthenticated
 *       403:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/", zoneController.getZones);

/**
 * @swagger
 * /api/zones/{id}/assign:
 *   put:
 *     summary: Assign a driver to a zone
 *     tags: [Zone]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The zone ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - driverId
 *             properties:
 *               driverId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Driver assigned
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
router.put("/:id/assign", zoneController.assignDriver);

module.exports = router;
