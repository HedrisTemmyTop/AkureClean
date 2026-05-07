const Assignment = require("../models/Assignment");
const asyncHandler = require("../utils/asyncHandler");

exports.getMyRoute = asyncHandler(async (req, res) => {
  const assignment = await Assignment.findOne({
    driverId: req.user._id,
    status: { $in: ["Pending", "InProgress"] },
  }).populate("stops.userId", "name phone address houseDescription pollingUnit");

  if (!assignment) {
    return res
      .status(404)
      .json({ success: false, message: "No active assignment found" });
  }

  // Keep frontend compatibility: expose stops also as 'route'
  const result = assignment.toObject();
  result.route = result.stops;

  res.json({
    success: true,
    data: result,
  });
});

exports.collectHousehold = asyncHandler(async (req, res) => {
  // Accepts either a userId or a householdId for backward compat
  const { householdId } = req.params;

  const assignment = await Assignment.findOne({
    driverId: req.user._id,
    status: { $in: ["Pending", "InProgress"] },
  });

  if (!assignment) {
    return res
      .status(404)
      .json({ success: false, message: "No active assignment found" });
  }

  // Match by userId first, then fall back to householdId
  const stop =
    assignment.stops.find(
      (s) => s.userId && s.userId.toString() === householdId,
    ) ||
    assignment.stops.find(
      (s) => s.householdId && s.householdId.toString() === householdId,
    );

  if (!stop) {
    return res.status(404).json({
      success: false,
      message: "Stop not found in current assignment",
    });
  }

  if (stop.status === "Completed") {
    return res
      .status(400)
      .json({ success: false, message: "Stop already collected" });
  }

  stop.status = "Completed";
  stop.collectedAt = new Date();

  if (assignment.status === "Pending") {
    assignment.status = "InProgress";
  }

  const allDone = assignment.stops.every(
    (s) => s.status === "Completed" || s.status === "Skipped",
  );
  if (allDone) {
    assignment.status = "Completed";
  }

  await assignment.save();

  const result = assignment.toObject();
  result.route = result.stops;

  res.json({
    success: true,
    message: "Stop marked as collected",
    data: result,
  });
});
