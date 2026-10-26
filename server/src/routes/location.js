const express = require("express");
const locationController = require("../controllers/location");
const protect = require("../middleware/auth");
const roleGuard = require("../middleware/roleGuard");

const router = express.Router();

// Public routes (used by Resident/Driver signup, profile editing, and admin task forms)
router.get("/structured", locationController.getStructuredLocations);
router.get("/lgas", locationController.getLocalGovts);
router.get("/wards", locationController.getWards);
router.get("/polling-units", locationController.getPollingUnits);

// Admin-only routes for managing LGAs, Wards, Polling Units & Bulk CSV Upload
router.use(protect);
router.use(roleGuard("admin"));

router.post("/lgas", locationController.createLocalGovt);
router.put("/lgas/:id", locationController.updateLocalGovt);
router.delete("/lgas/:id", locationController.deleteLocalGovt);

router.post("/wards", locationController.createWard);
router.put("/wards/:id", locationController.updateWard);
router.delete("/wards/:id", locationController.deleteWard);

router.post("/polling-units", locationController.createPollingUnit);
router.put("/polling-units/:id", locationController.updatePollingUnit);
router.delete("/polling-units/:id", locationController.deletePollingUnit);

router.post("/bulk-upload", locationController.bulkUploadLocations);
router.post("/seed-defaults", locationController.seedDefaultLocations);

module.exports = router;
