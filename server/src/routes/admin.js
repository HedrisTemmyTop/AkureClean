const express = require("express");
const adminController = require("../controllers/admin");
const protect = require("../middleware/auth");
const roleGuard = require("../middleware/roleGuard");

const router = express.Router();

router.use(protect);
router.use(roleGuard("admin"));

/**
 * @swagger
 * /api/admin/logs:
 *   get:
 *     summary: Get all system logs
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of logs
 *       401:
 *         description: Unauthenticated
 *       403:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/logs", adminController.getAllLogs);
/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all users
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 *       401:
 *         description: Unauthenticated
 *       403:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/users", adminController.getAllUsers);
/**
 * @swagger
 * /api/admin/stats:
 *   get:
 *     summary: Get dashboard statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics
 *       401:
 *         description: Unauthenticated
 *       403:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/stats", adminController.getDashboardStats);
/**
 * @swagger
 * /api/admin/drivers:
 *   get:
 *     summary: Get all drivers
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of drivers
 *       401:
 *         description: Unauthenticated
 *       403:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/drivers", adminController.getDrivers);
router.get("/residents", adminController.getAllResidents);
router.get("/payments", adminController.getAllPayments);
router.patch("/drivers/:id/status", adminController.updateDriverStatus);

module.exports = router;
