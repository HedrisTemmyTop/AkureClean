const fs = require('fs');
const path = require('path');

// 1. UPDATE ASSIGNMENT CONTROLLER
const assignmentCtrlPath = path.join(__dirname, 'src', 'controllers', 'assignment.js');
let assignmentCode = fs.readFileSync(assignmentCtrlPath, 'utf8');

const newCreateAssignment = `exports.createAssignment = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      data: errors.array(),
    });
  }

  const { driverId, title, collectionDate, pollingUnits, lga, ward } = req.body;

  // STEP 1 — Fetch all residents matching the area
  const residents = await User.find({
    role: "resident",
    localGovt: lga,
    ward: ward,
    pollingUnit: { $in: pollingUnits },
    "location.type": "Point",
    "location.coordinates": { $size: 2 }
  }).select("_id name phone address houseDescription ward localGovt pollingUnit location");

  if (residents.length === 0) {
    return res.status(400).json({ success: false, message: "No residents found for the selected area." });
  }

  // STEP 2 — Fetch the driver
  const driver = await User.findOne({ _id: driverId, role: "driver" });
  if (!driver) {
    return res.status(404).json({ success: false, message: "Driver not found" });
  }

  let driverCoords = [0, 0];
  if (driver.location && driver.location.coordinates && driver.location.coordinates.length === 2) {
    driverCoords = driver.location.coordinates;
  } else {
    return res.status(400).json({ success: false, message: "Driver has no valid location." });
  }

  // STEP 3 — Build the distance matrix
  const coordsList = [driverCoords, ...residents.map(r => r.location.coordinates)];
  const coordsString = coordsList.map(c => \`\${c[0]},\${c[1]}\`).join(";");
  const osrmTableUrl = \`http://router.project-osrm.org/table/v1/driving/\${coordsString}?sources=0\`;

  let distances = [];
  let isApproximate = false;

  try {
    const fetchController = new AbortController();
    const timeoutId = setTimeout(() => fetchController.abort(), 10000);
    const tableRes = await fetch(osrmTableUrl, { signal: fetchController.signal });
    clearTimeout(timeoutId);

    const tableData = await tableRes.json();
    if (tableData.code === "Ok" && tableData.durations && tableData.durations.length > 0) {
      distances = tableData.durations[0];
    } else {
      throw new Error("Invalid OSRM response");
    }
  } catch (err) {
    console.error("OSRM Table API failed, falling back to Haversine:", err.message);
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
      const coords1 = currentIdx === -1 ? driverCoords : residents[currentIdx].location.coordinates;
      const coords2 = residents[u].location.coordinates;
      
      const toRad = x => x * Math.PI / 180;
      const lon1 = coords1[0], lat1 = coords1[1];
      const lon2 = coords2[0], lat2 = coords2[1];
      const R = 6371;
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      cost = R * c; 

      if (cost < minCost) {
        minCost = cost;
        nearestIdx = u;
      }
    }

    optimizedRouteIndices.push(nearestIdx);
    unvisited = unvisited.filter(v => v !== nearestIdx);
    currentIdx = nearestIdx;
  }

  // STEP 5 — Build stops array
  const stops = optimizedRouteIndices.map(idx => {
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

  const orderedCoords = [driverCoords, ...stops.map(s => s.location.coordinates)];
  const orderedCoordsString = orderedCoords.map(c => \`\${c[0]},\${c[1]}\`).join(";");
  // Only taking up to 25 coords for estimation due to osrm limits sometimes
  // But let's try all
  const osrmRouteUrl = \`http://router.project-osrm.org/route/v1/driving/\${orderedCoordsString}\`;

  try {
    const fetchController = new AbortController();
    const timeoutId = setTimeout(() => fetchController.abort(), 10000);
    const routeRes = await fetch(osrmRouteUrl, { signal: fetchController.signal });
    clearTimeout(timeoutId);

    const routeData = await routeRes.json();
    if (routeData.code === "Ok" && routeData.routes && routeData.routes.length > 0) {
      const dist = (routeData.routes[0].distance / 1000).toFixed(1);
      const dur = Math.ceil(routeData.routes[0].duration / 60);
      estDistance = \`\${dist} km\${isApproximate ? ' (approx)' : ''}\`;
      estDuration = \`\${dur} mins\`;
    }
  } catch (err) {
    console.error("OSRM Route API failed:", err.message);
  }

  // STEP 7 — Save and return
  const assignment = await Assignment.create({
    driverId: driver._id,
    title: title || \`\${ward} Collection\`,
    area: \`\${lga} - \${ward}\`,
    collectionDate: new Date(collectionDate),
    collectionTime: "08:00 AM", // default
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
    message: \`You have a new assignment: "\${assignment.title}" scheduled for \${new Date(collectionDate).toDateString()}.\`,
    type: "System",
    relatedId: assignment._id,
    relatedModel: "Assignment",
  });

  if (driver.expoPushToken) {
    await notificationService.sendPushNotification(
      driver.expoPushToken,
      "New Assignment",
      \`You have a new assignment: "\${assignment.title}" scheduled for \${new Date(collectionDate).toDateString()}.\`
    );
  }

  res.status(201).json({
    success: true,
    message: "Assignment created successfully",
    data: assignment,
  });
});`;

// Replace from `exports.createAssignment = asyncHandler(async (req, res) => {` to the next `});` (around line 180).
// Since the exact block varies, let's use a regex to replace it.
assignmentCode = assignmentCode.replace(/exports\.createAssignment = asyncHandler\(async \(req, res\) => \{[\s\S]*?\}\);\s*\n\/\*\*/, newCreateAssignment + '\n\n/**');

fs.writeFileSync(assignmentCtrlPath, assignmentCode);

// 2. UPDATE DRIVER CONTROLLER
const driverCtrlPath = path.join(__dirname, 'src', 'controllers', 'driver.js');

const newDriverCode = `const Assignment = require("../models/Assignment");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");

exports.getMyRoute = asyncHandler(async (req, res) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const assignment = await Assignment.findOne({
    driverId: req.user._id,
    status: { $in: ["Pending", "InProgress"] },
    collectionDate: { $gte: startOfDay, $lte: endOfDay }
  }).populate("stops.userId", "name phone address houseDescription pollingUnit localGovt ward location");

  if (!assignment) {
    return res
      .status(404)
      .json({ success: false, message: "No active assignment found for today" });
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
`;
fs.writeFileSync(driverCtrlPath, newDriverCode);

// 3. UPDATE DRIVER ROUTES
const driverRoutesPath = path.join(__dirname, 'src', 'routes', 'driver.js');
let driverRoutes = fs.readFileSync(driverRoutesPath, 'utf8');

driverRoutes = driverRoutes.replace('router.put("/collect/:householdId", driverController.collectHousehold);', 
\`router.put("/collect/:assignmentId/:stopId", driverController.collectHousehold);
router.put("/skip/:assignmentId/:stopId", driverController.skipHousehold);\`);

fs.writeFileSync(driverRoutesPath, driverRoutes);

console.log("Backend updated successfully");
