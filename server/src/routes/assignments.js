const express = require("express");
const { check } = require("express-validator");
const assignmentController = require("../controllers/assignment");
const protect = require("../middleware/auth");
const roleGuard = require("../middleware/roleGuard");

const router = express.Router();

router.use(protect);

// Resident: get next collection date
router.get(
  "/resident/next-collection",
  roleGuard("resident"),
  assignmentController.getNextCollectionDate
);

// Admin: create assignment
router.post(
  "/",
  roleGuard("admin"),
  [
    check("driverEmail", "Driver email is required").isEmail(),
    check("title", "Title is required").notEmpty(),
    check("area", "Area is required").notEmpty(),
    check("collectionDate", "Collection date is required").isISO8601(),
    check("collectionTime", "Collection time is required").notEmpty(),
  ],
  assignmentController.createAssignment,
);

// Admin + Driver: list assignments (driver sees own via middleware)
router.get(
  "/",
  roleGuard("admin", "driver"),
  assignmentController.getAssignments,
);

// Admin + Driver: get single assignment
router.get(
  "/:id",
  roleGuard("admin", "driver"),
  assignmentController.getAssignmentById,
);

// Admin + Driver: update assignment status
router.patch(
  "/:id/status",
  roleGuard("admin", "driver"),
  [check("status", "Status is required").notEmpty()],
  assignmentController.updateAssignmentStatus,
);

// Driver: update a single stop's status
router.patch(
  "/:routeId/stops/:stopId",
  roleGuard("admin", "driver"),
  [check("status", "Status is required").notEmpty()],
  assignmentController.updateStopStatus,
);

module.exports = router;
