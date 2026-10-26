const Zone = require('../models/Zone');
const Household = require('../models/Household');
const CollectionLog = require('../models/CollectionLog');
const User = require('../models/User');
const osrmService = require('../services/osrm');
const routeOptimization = require('../services/routeOptimization');
const notificationService = require('../services/notification');
const asyncHandler = require('../utils/asyncHandler');
const { filterPaidResidents } = require('../utils/billing');

exports.generateRoute = asyncHandler(async (req, res) => {
  const { zoneId } = req.params;

  const zone = await Zone.findById(zoneId);
  if (!zone) {
    return res.status(404).json({ success: false, message: 'Zone not found' });
  }

  if (!zone.assignedDriverId) {
    return res.status(400).json({ success: false, message: 'No driver assigned to this zone' });
  }

  // Check if there's already an in-progress log for today
  const existingLog = await CollectionLog.findOne({
    zoneId,
    status: 'in_progress'
  });

  if (existingLog) {
    return res.status(400).json({ success: false, message: 'A route is already in progress for this zone' });
  }

  const allHouseholds = await Household.find({ zoneId }).populate(
    'userId',
    'expoPushToken houseType numberOfWorkersRange createdAt'
  );
  if (allHouseholds.length === 0) {
    return res.status(400).json({ success: false, message: 'No households found in this zone' });
  }

  const householdUsers = allHouseholds
    .map((h) => h.userId)
    .filter(Boolean);
  const paidUsers = await filterPaidResidents(householdUsers);
  const paidUserIds = new Set(paidUsers.map((u) => u._id.toString()));

  const households = allHouseholds.filter(
    (h) => h.userId && paidUserIds.has(h.userId._id.toString())
  );
  if (households.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No households with paid waste bills found in this zone',
    });
  }

  const depot = { lat: 7.2571, lng: 5.2058 }; // Hardcoded depot
  
  // Format coordinates for OSRM: [depot, ...household_coords]
  const coordinates = [depot, ...households.map(h => h.coordinates)];

  const distanceMatrix = await osrmService.getDistanceMatrix(coordinates);
  
  const optimizedHouseholds = routeOptimization.nearestNeighbor(depot, households, distanceMatrix);

  // Map to route objects
  const routePoints = optimizedHouseholds.map(h => ({
    householdId: h._id,
    coordinates: h.coordinates,
    status: 'pending'
  }));

  const log = await CollectionLog.create({
    zoneId,
    driverId: zone.assignedDriverId,
    route: routePoints,
    status: 'in_progress'
  });

  // Send notifications to residents
  const tokens = households
    .map(h => h.userId.expoPushToken)
    .filter(token => token);

  if (tokens.length > 0) {
    await notificationService.sendBulkNotification(
      tokens,
      'Waste Collection Today',
      'Your waste will be collected today. Please ensure your bins are accessible.'
    );
  }

  res.json({
    success: true,
    message: 'Route generated successfully',
    data: log
  });
});
