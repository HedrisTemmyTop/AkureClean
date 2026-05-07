const express = require("express");
const routeController = require("../controllers/route");
const protect = require("../middleware/auth");
const roleGuard = require("../middleware/roleGuard");

const router = express.Router();

router.use(protect);
router.use(roleGuard("admin"));

/**
 * @swagger
 * /api/routes/generate/{zoneId}:
 *   post:
 *     summary: Generate a route for a zone
 *     tags: [Route]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: zoneId
 *         required: true
 *         schema:
 *           type: string
 *         description: The zone ID
 *     responses:
 *       201:
 *         description: Route generated
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
router.post("/generate/:zoneId", routeController.generateRoute);

module.exports = router;
