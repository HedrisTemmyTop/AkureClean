const express = require("express");
const { check } = require("express-validator");
const reportController = require("../controllers/report");
const protect = require("../middleware/auth");
const roleGuard = require("../middleware/roleGuard");

const router = express.Router();

router.use(protect);

// Resident: submit and view own reports
router.post(
  "/",
  roleGuard("resident"),
  [
    check("street", "Street address is required").notEmpty(),
    check("type")
      .optional()
      .isIn(["General", "Recyclables", "Hazardous", "Bulky"]),
    check("severity").optional().isIn(["Low", "Medium", "High", "Critical"]),
  ],
  reportController.createReport,
);

router.get("/mine", roleGuard("resident"), reportController.getMyReports);

// Admin + Driver: view all reports with filters
router.get("/", roleGuard("admin", "driver"), reportController.getAllReports);

// Any authenticated user can view a single report (ownership enforced inside controller)
router.get("/:id", reportController.getReportById);

// Admin + Driver: update report status
router.patch(
  "/:id/status",
  roleGuard("admin", "driver"),
  [check("status", "Status is required").notEmpty()],
  reportController.updateReportStatus,
);

module.exports = router;
