const mongoose = require("mongoose");
const env = require("./src/config/env");
const { seedLocationsFromJson } = require("./src/utils/seedLocations");

async function run() {
  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log("Connected to MongoDB for seeding locations...");
    const result = await seedLocationsFromJson(true);
    console.log("Seed complete:", result);
    process.exit(0);
  } catch (err) {
    console.error("Failed to seed locations:", err);
    process.exit(1);
  }
}

run();
