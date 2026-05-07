const express = require("express");
const { check } = require("express-validator");
const scheduleController = require("../controllers/schedule");
const protect = require("../middleware/auth");
const roleGuard = require("../middleware/roleGuard");

const router = express.Router();

router.use(protect);

// Resident: get own schedules based on ward/LGA stored on their profile
router.get("/mine", roleGuard("resident"), scheduleController.getMySchedules);

// Admin: list all schedules
router.get("/", roleGuard("admin"), scheduleController.getAllSchedules);

// Admin: create schedule
router.post(
  "/",
  roleGuard("admin"),
  [
    check("zoneId", "Zone ID is required").isMongoId(),
    check("dayOfWeek", "Day of week is required").isIn([
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ]),
    check("nextPickup", "Next pickup date is required").isISO8601(),
  ],
  scheduleController.createSchedule,
);

// Admin: update schedule
router.patch("/:id", roleGuard("admin"), scheduleController.updateSchedule);

module.exports = router;
