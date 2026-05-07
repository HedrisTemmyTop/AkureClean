const express = require("express");
const router = express.Router();
const paystackController = require("../controllers/paystack");
const protect = require("../middleware/auth");

router.post("/initialize", protect, paystackController.initialize);
router.post("/verify", protect, paystackController.verify);
router.post("/webhook", paystackController.webhook);

module.exports = router;
