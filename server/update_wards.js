require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./src/models/User");
const Household = require("./src/models/Household");

mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/akure_clean")
  .then(async () => {
    try {
      const newWard = "WARD 03  - GBOGI/ISIKAN    II";

      const userResult = await User.updateMany(
        { ward: "FUTA Ward" },
        { $set: { ward: newWard } }
      );

      const householdResult = await Household.updateMany(
        { ward: "FUTA Ward" },
        { $set: { ward: newWard } }
      );

      console.log(`Successfully updated ${userResult.modifiedCount} users to ${newWard}`);
      console.log(`Successfully updated ${householdResult.modifiedCount} households to ${newWard}`);
      process.exit(0);
    } catch (err) {
      console.error("Error updating wards:", err);
      process.exit(1);
    }
  })
  .catch((err) => {
    console.error("Could not connect to MongoDB", err);
    process.exit(1);
  });
