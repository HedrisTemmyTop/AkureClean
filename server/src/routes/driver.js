const express = require("express");
const driverController = require("../controllers/driver");
const protect = require("../middleware/auth");
const roleGuard = require("../middleware/roleGuard");

const router = express.Router();

router.use(protect);
router.use(roleGuard("driver"));

/**
 * @swagger
 * /api/driver/route:
 *   get:
 *     summary: Get driver's assigned route
 *     tags: [Driver]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Route details
 *       401:
 *         description: Unauthenticated
 *       403:
 *         description: Unauthorized
 *       404:
 *         description: Not found
 *       500:
 *         description: Server error
 */
router.get("/route", driverController.getMyRoute);
/**
 * @swagger
 * /api/driver/collect/{householdId}:
 *   put:
 *     summary: Mark household as collected
 *     tags: [Driver]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: householdId
 *         required: true
 *         schema:
 *           type: string
 *         description: The household ID
 *     responses:
 *       200:
 *         description: Household marked as collected
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
router.put("/collect/:assignmentId/:stopId", driverController.collectHousehold);
router.put("/skip/:assignmentId/:stopId", driverController.skipHousehold);

module.exports = router;
