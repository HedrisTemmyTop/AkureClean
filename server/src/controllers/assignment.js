const Assignment = require("../models/Assignment");
const Report = require("../models/Report");
const User = require("../models/User");
const Notification = require("../models/Notification");
const notificationService = require("../services/notification");
const { logActivity } = require("../utils/logger");
const asyncHandler = require("../utils/asyncHandler");
const { validationResult } = require("express-validator");

/**
 * @desc    Create a new assignment (admin only)
 * @route   POST /api/assignments
 * @access  Private (Admin)
 */
exports.createAssignment = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      data: errors.array(),
    });
  }

  const {
    driverEmail,
    zoneId,
    title,
    area,
    collectionDate,
    collectionTime,
    estimatedDistance,
    estimatedDuration,
    stops,
    pollingUnits,
    segments,
  } = req.body;

  // Verify driver exists and has the right role
  const driver = await User.findOne({ email: driverEmail, role: "driver" });
  if (!driver) {
    return res.status(404).json({
      success: false,
      message: "Driver not found or user is not a driver",
    });
  }

  console.log("driver not found");

  let finalStops = stops || [];

  // NEW: Segment-based bounding box search
  // segments: [{ start: [lng, lat], end: [lng, lat] }]
  if (segments && Array.isArray(segments) && segments.length > 0) {
    for (const seg of segments) {
      const { start, end } = seg;
      if (
        !Array.isArray(start) ||
        start.length !== 2 ||
        !Array.isArray(end) ||
        end.length !== 2
      )
        continue;

      const minLng = Math.min(start[0], end[0]);
      const maxLng = Math.max(start[0], end[0]);
      const minLat = Math.min(start[1], end[1]);
      const maxLat = Math.max(start[1], end[1]);

      // ~330m padding so boundary households are included
      const PAD = 0.003;

      const residentsInBox = await User.find({
        role: "resident",
        "location.type": "Point",
        location: {
          $geoWithin: {
            $box: [
              [minLng - PAD, minLat - PAD],
              [maxLng + PAD, maxLat + PAD],
            ],
          },
        },
      }).select(
        "_id name phone address houseDescription ward localGovt pollingUnit location",
      );

      for (const u of residentsInBox) {
        if (
          !finalStops.some((s) => s.userId?.toString() === u._id.toString())
        ) {
          finalStops.push({
            userId: u._id,
            address: u.address || "Unknown Address",
            street: u.houseDescription || "",
            ward: u.ward || "",
            lga: u.localGovt || "",
            pollingUnit: u.pollingUnit || "",
            location: u.location,
            status: "Pending",
          });
        }
      }
    }
  }

  // LEGACY: Individual polling unit radius search (kept for backward compat)
  if (pollingUnits && Array.isArray(pollingUnits) && pollingUnits.length > 0) {
    for (const puCoord of pollingUnits) {
      if (!Array.isArray(puCoord) || puCoord.length !== 2) continue;

      const nearbyResidents = await User.find({
        role: "resident",
        "location.type": "Point",
        location: {
          $near: {
            $geometry: { type: "Point", coordinates: puCoord },
            $maxDistance: 1500,
          },
        },
      }).select(
        "_id name phone address houseDescription ward localGovt pollingUnit location",
      );

      for (const u of nearbyResidents) {
        if (
          !finalStops.some((s) => s.userId?.toString() === u._id.toString())
        ) {
          finalStops.push({
            userId: u._id,
            address: u.address || "Unknown Address",
            street: u.houseDescription || "",
            ward: u.ward || "",
            lga: u.localGovt || "",
            pollingUnit: u.pollingUnit || "",
            location: u.location,
            status: "Pending",
          });
        }
      }
    }
  }

  const assignment = await Assignment.create({
    driverId: driver._id,
    zoneId: zoneId || null,
    title,
    area,
    collectionDate: new Date(collectionDate),
    collectionTime,
    estimatedDistance: estimatedDistance || "",
    estimatedDuration: estimatedDuration || "",
    stops: finalStops,
    status: "Pending",
  });

  // Notify the driver
  await Notification.create({
    userId: driver._id,
    title: "New Assignment",
    message: `You have a new assignment: "${title}" scheduled for ${new Date(collectionDate).toDateString()}.`,
    type: "System",
    relatedId: assignment._id,
    relatedModel: "Assignment",
  });

  if (driver.expoPushToken) {
    await notificationService.sendPushNotification(
      driver.expoPushToken,
      "New Assignment",
      `You have a new assignment: "${title}" scheduled for ${new Date(collectionDate).toDateString()}.`
    );
  }

  res.status(201).json({
    success: true,
    message: "Assignment created successfully",
    data: assignment,
  });
});

/**
 * @desc    Get all assignments (admin sees all; driver sees own)
 * @route   GET /api/assignments
 * @access  Private (Admin, Driver)
 */
exports.getAssignments = asyncHandler(async (req, res) => {
  const filter = {};

  if (req.user.role === "driver") {
    filter.driverId = req.user._id;
  }

  // Admins can filter by driverId via query param
  if (req.user.role === "admin" && req.query.driverId) {
    filter.driverId = req.query.driverId;
  }

  if (req.query.status) filter.status = req.query.status;

  const assignments = await Assignment.find(filter)
    .populate("driverId", "name email phone")
    .populate("zoneId", "name")
    .sort({ collectionDate: -1 });

  res.json({ success: true, data: assignments });
});

/**
 * @desc    Get a single assignment by ID
 * @route   GET /api/assignments/:id
 * @access  Private (Admin, Driver — own only)
 */
exports.getAssignmentById = asyncHandler(async (req, res) => {
  const assignment = await Assignment.findById(req.params.id)
    .populate("driverId", "name email phone")
    .populate("zoneId", "name")
    .populate("stops.householdId")
    .populate("stops.reportId");

  if (!assignment) {
    return res
      .status(404)
      .json({ success: false, message: "Assignment not found" });
  }

  // Drivers can only see their own assignments
  if (
    req.user.role === "driver" &&
    assignment.driverId._id.toString() !== req.user._id.toString()
  ) {
    return res.status(403).json({ success: false, message: "Not authorized" });
  }

  res.json({ success: true, data: assignment });
});

/**
 * @desc    Update an assignment's overall status
 * @route   PATCH /api/assignments/:id/status
 * @access  Private (admin, driver — own)
 */
exports.updateAssignmentStatus = asyncHandler(async (req, res) => {
  const { status, actualDuration } = req.body;

  const validStatuses = ["Pending", "InProgress", "Paused", "Completed"];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: `Status must be one of: ${validStatuses.join(", ")}`,
    });
  }

  const assignment = await Assignment.findById(req.params.id);
  if (!assignment) {
    return res
      .status(404)
      .json({ success: false, message: "Assignment not found" });
  }

  if (
    req.user.role === "driver" &&
    assignment.driverId.toString() !== req.user._id.toString()
  ) {
    return res.status(403).json({ success: false, message: "Not authorized" });
  }

  const oldStatus = assignment.status;
  assignment.status = status;
  if (actualDuration) assignment.actualDuration = actualDuration;
  await assignment.save();

  await logActivity(req.user._id, "Update Route", `Updated route ${assignment.area} to ${status}`);

  // If driver just started the route, notify all residents
  if (oldStatus !== "InProgress" && status === "InProgress") {
    try {
      const userIds = assignment.stops
        .map(stop => stop.userId)
        .filter(id => id); // filter out nulls

      if (userIds.length > 0) {
        // Unique user IDs
        const uniqueUserIds = [...new Set(userIds.map(id => id.toString()))];
        
        const users = await User.find({ _id: { $in: uniqueUserIds } });
        const tokens = users.map(u => u.expoPushToken).filter(t => t);

        if (tokens.length > 0) {
          await notificationService.sendBulkNotification(
            tokens,
            "Collector is on the way!",
            `Your waste collection route in ${assignment.area} has started.`
          );
        }

        // Also create in-app notifications
        const appNotifications = uniqueUserIds.map(userId => ({
          userId,
          title: "Collector is on the way!",
          message: `Your waste collection route in ${assignment.area} has started.`,
          type: "AssignmentUpdate",
          relatedId: assignment._id,
          relatedModel: "Assignment"
        }));
        await Notification.insertMany(appNotifications);
      }
    } catch (err) {
      console.error("Failed to send route start notifications:", err);
    }
  }

  res.json({
    success: true,
    message: "Assignment status updated",
    data: assignment,
  });
});

/**
 * @desc    Update a single stop's status within an assignment
 * @route   PATCH /api/assignments/:routeId/stops/:stopId
 * @access  Private (driver — own)
 */
exports.updateStopStatus = asyncHandler(async (req, res) => {
  const { routeId, stopId } = req.params;
  const { status, collectionNote } = req.body;

  const validStatuses = ["Pending", "Completed", "Skipped"];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: `Status must be one of: ${validStatuses.join(", ")}`,
    });
  }

  const assignment = await Assignment.findById(routeId);
  if (!assignment) {
    return res
      .status(404)
      .json({ success: false, message: "Assignment not found" });
  }

  if (
    req.user.role === "driver" &&
    assignment.driverId.toString() !== req.user._id.toString()
  ) {
    return res.status(403).json({ success: false, message: "Not authorized" });
  }

  const stop = assignment.stops.id(stopId);
  if (!stop) {
    return res
      .status(404)
      .json({ success: false, message: "Stop not found in this assignment" });
  }

  stop.status = status;
  if (collectionNote) stop.collectionNote = collectionNote;
  if (status === "Completed") stop.collectedAt = new Date();

  // If all stops are done, auto-complete the assignment
  const allDone = assignment.stops.every(
    (s) => s.status === "Completed" || s.status === "Skipped",
  );
  if (allDone && assignment.status !== "Completed") {
    assignment.status = "Completed";
  }

  await assignment.save();

  // If the stop is linked to a report, update the report status too
  if (stop.reportId && status === "Completed") {
    await Report.findByIdAndUpdate(stop.reportId, {
      status: "Completed",
      completedDate: new Date(),
    });
  }

  res.json({ success: true, message: "Stop status updated", data: assignment });
});

/**
 * @desc    Get next collection date for resident
 * @route   GET /api/assignments/resident/next-collection
 * @access  Private (Resident)
 */
exports.getNextCollectionDate = asyncHandler(async (req, res) => {
  const user = req.user;

  // Try to find an assignment where this user is explicitly a stop
  let assignment = await Assignment.findOne({
    "stops.userId": user._id,
    collectionDate: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
    status: { $in: ["Pending", "InProgress"] },
  }).sort({ collectionDate: 1 });

  // If not found, fall back to matching lga, ward, pollingUnit
  if (!assignment) {
    assignment = await Assignment.findOne({
      "stops.lga": user.localGovt,
      "stops.ward": user.ward,
      "stops.pollingUnit": user.pollingUnit,
      collectionDate: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      status: { $in: ["Pending", "InProgress"] },
    }).sort({ collectionDate: 1 });
  }

  if (!assignment) {
    return res.status(404).json({
      success: false,
      message: "No upcoming collection found for your area",
    });
  }

  res.json({
    success: true,
    data: {
      collectionDate: assignment.collectionDate,
      collectionTime: assignment.collectionTime || "Not specified",
      title: assignment.title,
    },
  });
});
