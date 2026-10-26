const express = require("express");
const availabilityController = require("../controllers/availability");
const protect = require("../middleware/auth");
const roleGuard = require("../middleware/roleGuard");

const router = express.Router();

router.use(protect);

// Driver: get own availability for a month
router.get(
  "/me",
  roleGuard("driver"),
  availabilityController.getMyAvailability
);

// Driver: create or update monthly availability (1 day per week)
router.post(
  "/",
  roleGuard("driver"),
  availabilityController.saveMyAvailability
);

router.put(
  "/",
  roleGuard("driver"),
  availabilityController.saveMyAvailability
);

// Resident: get available pickup dates for the driver assigned to their Polling Unit & Local Govt
router.get(
  "/resident",
  roleGuard("resident"),
  availabilityController.getResidentAvailableDates
);

// Admin: view all drivers' monthly availability schedules
router.get(
  "/admin",
  roleGuard("admin"),
  availabilityController.getAllDriversAvailability
);

// Admin: approve a driver's monthly availability (locks it & publishes to residents)
router.patch(
  "/admin/:id/approve",
  roleGuard("admin"),
  availabilityController.approveAvailability
);

// Admin: reject a driver's monthly availability with a reason
router.patch(
  "/admin/:id/reject",
  roleGuard("admin"),
  availabilityController.rejectAvailability
);

module.exports = router;
