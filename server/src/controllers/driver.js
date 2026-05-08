const Assignment = require("../models/Assignment");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");

exports.getMyRoute = asyncHandler(async (req, res) => {
  const { assignmentId } = req.query;
  let filter = { driverId: req.user._id };
  
  if (assignmentId) {
    filter._id = assignmentId;
  } else {
    // We want to find the most relevant assignment for this driver.
    // 1. Check for any InProgress or Pending assignment for today.
    // 2. If none, check for any Completed assignment for today.
    // 3. If none, check for the next upcoming Pending assignment.
    
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    filter.collectionDate = { $gte: startOfDay };
    filter.status = { $in: ["Pending", "InProgress", "Completed"] };
  }

  // Sort by date (closest first), and status (InProgress < Pending < Completed)
  const assignment = await Assignment.findOne(filter)
    .sort({ collectionDate: 1, status: 1 })
    .populate("stops.userId", "name phone address houseDescription pollingUnit localGovt ward location");

  if (!assignment) {
    return res.status(404).json({
      success: false,
      message: assignmentId ? "Assignment not found" : "No active assignment found for today",
    });
  }

  const driver = await User.findById(req.user._id);

  // Return full assignment including stops in optimizedRoute order
  // And return driver's own coordinates as startPoint
  const result = assignment.toObject();
  
  res.json({
    success: true,
    data: {
      ...result,
      startPoint: driver.location,
    }
  });
});

exports.collectHousehold = asyncHandler(async (req, res) => {
  const { assignmentId, stopId } = req.params;

  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) {
    return res.status(404).json({ success: false, message: "Assignment not found" });
  }

  const stop = assignment.stops.id(stopId);
  if (!stop) {
    return res.status(404).json({ success: false, message: "Stop not found" });
  }

  stop.status = 'Completed';
  stop.collectedAt = new Date();

  const allDone = assignment.stops.every(
    (s) => s.status === "Completed" || s.status === "Skipped"
  );
  if (allDone) {
    assignment.status = "Completed";
  } else if (assignment.status === "Pending") {
    assignment.status = "InProgress";
  }

  await assignment.save();

  res.json({
    success: true,
    message: "Stop marked as collected",
    data: assignment,
  });
});

exports.skipHousehold = asyncHandler(async (req, res) => {
  const { assignmentId, stopId } = req.params;
  const { reason } = req.body;

  if (!reason || !reason.trim()) {
    return res.status(400).json({ success: false, message: "Reason is required" });
  }

  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) {
    return res.status(404).json({ success: false, message: "Assignment not found" });
  }

  const stop = assignment.stops.id(stopId);
  if (!stop) {
    return res.status(404).json({ success: false, message: "Stop not found" });
  }

  stop.status = 'Skipped';
  stop.skipReason = reason;

  const allDone = assignment.stops.every(
    (s) => s.status === "Completed" || s.status === "Skipped"
  );
  if (allDone) {
    assignment.status = "Completed";
  } else if (assignment.status === "Pending") {
    assignment.status = "InProgress";
  }

  await assignment.save();

  res.json({
    success: true,
    message: "Stop marked as skipped",
    data: assignment,
  });
});

