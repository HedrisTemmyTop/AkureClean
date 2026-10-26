require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./src/models/User");
const Household = require("./src/models/Household");

mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/akure_clean")
  .then(async () => {
    try {
      const oldPollingUnit = "FUTA Gate";
      const newPollingUnit = "FUTA GATE"; // Matches the exact casing in output.json

      const userResult = await User.updateMany(
        { pollingUnit: oldPollingUnit },
        { $set: { pollingUnit: newPollingUnit } }
      );

      const householdResult = await Household.updateMany(
        { pollingUnit: oldPollingUnit },
        { $set: { pollingUnit: newPollingUnit } }
      );

      console.log(`Successfully updated ${userResult.modifiedCount} users to ${newPollingUnit}`);
      console.log(`Successfully updated ${householdResult.modifiedCount} households to ${newPollingUnit}`);
      process.exit(0);
    } catch (err) {
      console.error("Error updating polling units:", err);
      process.exit(1);
    }
  })
  .catch((err) => {
    console.error("Could not connect to MongoDB", err);
    process.exit(1);
  });
