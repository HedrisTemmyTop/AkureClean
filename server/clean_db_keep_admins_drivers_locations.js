const mongoose = require("mongoose");
const env = require("./src/config/env");

const User = require("./src/models/User");
const LocalGovt = require("./src/models/LocalGovt");
const Ward = require("./src/models/Ward");
const PollingUnit = require("./src/models/PollingUnit");

const ActivityLog = require("./src/models/ActivityLog");
const Assignment = require("./src/models/Assignment");
const Bill = require("./src/models/Bill");
const CollectionLog = require("./src/models/CollectionLog");
const DriverAvailability = require("./src/models/DriverAvailability");
const Household = require("./src/models/Household");
const Notification = require("./src/models/Notification");
const PickupRequest = require("./src/models/PickupRequest");
const Report = require("./src/models/Report");
const Schedule = require("./src/models/Schedule");
const Zone = require("./src/models/Zone");
const { seedLocationsFromJson } = require("./src/utils/seedLocations");

async function cleanDatabase() {
  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log("Connected to MongoDB.");

    // 1. Delete all Users except admin and driver accounts
    const deletedUsers = await User.deleteMany({
      role: { $nin: ["admin", "driver"] },
    });
    console.log(`Deleted non-admin/driver users (residents): ${deletedUsers.deletedCount}`);

    // 2. Delete all other operational collections
    const [
      delActivityLogs,
      delAssignments,
      delBills,
      delCollectionLogs,
      delDriverAvailabilities,
      delHouseholds,
      delNotifications,
      delPickupRequests,
      delReports,
      delSchedules,
      delZones,
    ] = await Promise.all([
      ActivityLog.deleteMany({}),
      Assignment.deleteMany({}),
      Bill.deleteMany({}),
      CollectionLog.deleteMany({}),
      DriverAvailability.deleteMany({}),
      Household.deleteMany({}),
      Notification.deleteMany({}),
      PickupRequest.deleteMany({}),
      Report.deleteMany({}),
      Schedule.deleteMany({}),
      Zone.deleteMany({}),
    ]);

    console.log("Deleted documents summary:");
    console.log(`- ActivityLogs: ${delActivityLogs.deletedCount}`);
    console.log(`- Assignments: ${delAssignments.deletedCount}`);
    console.log(`- Bills: ${delBills.deletedCount}`);
    console.log(`- CollectionLogs: ${delCollectionLogs.deletedCount}`);
    console.log(`- DriverAvailabilities: ${delDriverAvailabilities.deletedCount}`);
    console.log(`- Households: ${delHouseholds.deletedCount}`);
    console.log(`- Notifications: ${delNotifications.deletedCount}`);
    console.log(`- PickupRequests: ${delPickupRequests.deletedCount}`);
    console.log(`- Reports: ${delReports.deletedCount}`);
    console.log(`- Schedules: ${delSchedules.deletedCount}`);
    console.log(`- Zones: ${delZones.deletedCount}`);

    // Ensure LGAs, Wards, and Polling Units are present
    await seedLocationsFromJson(false);

    // 3. Verify remaining counts
    const [
      adminCount,
      driverCount,
      residentCount,
      lgaCount,
      wardCount,
      puCount,
    ] = await Promise.all([
      User.countDocuments({ role: "admin" }),
      User.countDocuments({ role: "driver" }),
      User.countDocuments({ role: "resident" }),
      LocalGovt.countDocuments(),
      Ward.countDocuments(),
      PollingUnit.countDocuments(),
    ]);

    console.log("\nRemaining database state:");
    console.log(`- Admins kept: ${adminCount}`);
    console.log(`- Drivers kept: ${driverCount}`);
    console.log(`- Residents remaining: ${residentCount}`);
    console.log(`- Local Governments kept: ${lgaCount}`);
    console.log(`- Wards kept: ${wardCount}`);
    console.log(`- Polling Units kept: ${puCount}`);

    process.exit(0);
  } catch (err) {
    console.error("Error cleaning database:", err);
    process.exit(1);
  }
}

cleanDatabase();
