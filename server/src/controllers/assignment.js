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
  console.log("errors: ", errors);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      data: errors.array(),
    });
  }

  const { driverId, title, collectionDate, collectionTime, pollingUnits, lga, ward } = req.body;

  // STEP 1 — Fetch all residents matching the area
  const residents = await User.find({
    role: "resident",
    localGovt: lga,
    ward: ward,
    pollingUnit: { $in: pollingUnits },
    "location.type": "Point",
    "location.coordinates": { $size: 2 },
  }).select(
    "_id name phone address houseDescription ward localGovt pollingUnit location",
  );

  if (residents.length === 0) {
    return res.status(400).json({
      success: false,
      message: "No residents found for the selected area.",
    });
  }

  // STEP 2 — Fetch the driver
  const driver = await User.findOne({ _id: driverId, role: "driver" });
  if (!driver) {
    return res
      .status(404)
      .json({ success: false, message: "Driver not found" });
  }

  let driverCoords = [0, 0];
  if (
    driver.location &&
    driver.location.coordinates &&
    driver.location.coordinates.length === 2
  ) {
    driverCoords = driver.location.coordinates;
  } else {
    return res
      .status(400)
      .json({ success: false, message: "Driver has no valid location." });
  }

  // STEP 3 — Build the distance matrix
  const coordsList = [
    driverCoords,
    ...residents.map((r) => r.location.coordinates),
  ];
  const coordsString = coordsList.map((c) => `${c[0]},${c[1]}`).join(";");
  const osrmTableUrl = `http://router.project-osrm.org/table/v1/driving/${coordsString}?sources=0`;

  let distances = [];
  let isApproximate = false;

  try {
    const fetchController = new AbortController();
    const timeoutId = setTimeout(() => fetchController.abort(), 10000);
    const tableRes = await fetch(osrmTableUrl, {
      signal: fetchController.signal,
    });
    clearTimeout(timeoutId);

    const tableData = await tableRes.json();
    if (
      tableData.code === "Ok" &&
      tableData.durations &&
      tableData.durations.length > 0
    ) {
      distances = tableData.durations[0];
    } else {
      throw new Error("Invalid OSRM response");
    }
  } catch (err) {
    console.error(
      "OSRM Table API failed, falling back to Haversine:",
      err.message,
    );
    isApproximate = true;
  }

  // STEP 4 — Run nearest-neighbor heuristic
  let unvisited = residents.map((r, idx) => idx);
  let optimizedRouteIndices = [];
  let currentIdx = -1;

  while (unvisited.length > 0) {
    let nearestIdx = -1;
    let minCost = Infinity;

    for (let u of unvisited) {
      let cost;
      const coords1 =
        currentIdx === -1
          ? driverCoords
          : residents[currentIdx].location.coordinates;
      const coords2 = residents[u].location.coordinates;

      const toRad = (x) => (x * Math.PI) / 180;
      const lon1 = coords1[0],
        lat1 = coords1[1];
      const lon2 = coords2[0],
        lat2 = coords2[1];
      const R = 6371;
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) *
          Math.cos(toRad(lat2)) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      cost = R * c;

      if (cost < minCost) {
        minCost = cost;
        nearestIdx = u;
      }
    }

    optimizedRouteIndices.push(nearestIdx);
    unvisited = unvisited.filter((v) => v !== nearestIdx);
    currentIdx = nearestIdx;
  }

  // STEP 5 — Build stops array
  const stops = optimizedRouteIndices.map((idx) => {
    const u = residents[idx];
    return {
      userId: u._id,
      address: u.address || "Unknown Address",
      street: u.houseDescription || "",
      ward: u.ward || "",
      lga: u.localGovt || "",
      pollingUnit: u.pollingUnit || "",
      location: u.location,
      status: "Pending",
      collectedAt: null,
      skipReason: null,
    };
  });

  // STEP 6 — Calculate estimates
  let estDistance = "0 km";
  let estDuration = "0 mins";

  const orderedCoords = [
    driverCoords,
    ...stops.map((s) => s.location.coordinates),
  ];
  const orderedCoordsString = orderedCoords
    .map((c) => `${c[0]},${c[1]}`)
    .join(";");
  // Limit to roughly 50 waypoints to avoid OSRM limits, or try full
  const osrmRouteUrl = `http://router.project-osrm.org/route/v1/driving/${orderedCoordsString}`;

  try {
    const fetchController = new AbortController();
    const timeoutId = setTimeout(() => fetchController.abort(), 10000);
    const routeRes = await fetch(osrmRouteUrl, {
      signal: fetchController.signal,
    });
    clearTimeout(timeoutId);

    const routeData = await routeRes.json();
    if (
      routeData.code === "Ok" &&
      routeData.routes &&
      routeData.routes.length > 0
    ) {
      const dist = (routeData.routes[0].distance / 1000).toFixed(1);
      const dur = Math.ceil(routeData.routes[0].duration / 60);
      estDistance = `${dist} km${isApproximate ? " (approx)" : ""}`;
      estDuration = `${dur} mins`;
    }
  } catch (err) {
    console.error("OSRM Route API failed:", err.message);
  }

  // STEP 7 — Save and return
  const assignment = await Assignment.create({
    driverId: driver._id,
    title: title || `${ward} Collection`,
    area: `${lga} - ${ward}`,
    collectionDate: new Date(collectionDate),
    collectionTime: collectionTime || "08:00 AM",
    estimatedDistance: estDistance,
    estimatedDuration: estDuration,
    stops: stops,
    optimizedRoute: optimizedRouteIndices,
    status: "Pending",
  });

  // Notify the driver
  await Notification.create({
    userId: driver._id,
    title: "New Assignment",
    message: `You have a new assignment: "${assignment.title}" scheduled for ${new Date(collectionDate).toDateString()}.`,
    type: "System",
    relatedId: assignment._id,
    relatedModel: "Assignment",
  });

  if (driver.expoPushToken) {
    await notificationService.sendPushNotification(
      driver.expoPushToken,
      "New Assignment",
      `You have a new assignment: "${assignment.title}" scheduled for ${new Date(collectionDate).toDateString()}.`,
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

  await logActivity(
    req.user._id,
    "Update Route",
    `Updated route ${assignment.area} to ${status}`,
  );

  // If driver just started the route, notify all residents
  if (oldStatus !== "InProgress" && status === "InProgress") {
    try {
      const userIds = assignment.stops
        .map((stop) => stop.userId)
        .filter((id) => id); // filter out nulls

      if (userIds.length > 0) {
        // Unique user IDs
        const uniqueUserIds = [...new Set(userIds.map((id) => id.toString()))];

        const users = await User.find({ _id: { $in: uniqueUserIds } });
        const tokens = users.map((u) => u.expoPushToken).filter((t) => t);

        if (tokens.length > 0) {
          await notificationService.sendBulkNotification(
            tokens,
            "Collector is on the way!",
            `Your waste collection route in ${assignment.area} has started.`,
          );
        }

        // Also create in-app notifications
        const appNotifications = uniqueUserIds.map((userId) => ({
          userId,
          title: "Collector is on the way!",
          message: `Your waste collection route in ${assignment.area} has started.`,
          type: "AssignmentUpdate",
          relatedId: assignment._id,
          relatedModel: "Assignment",
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
  if (collectionNote) {
    stop.collectionNote = collectionNote;
    if (status === "Skipped") stop.skipReason = collectionNote;
  }
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
