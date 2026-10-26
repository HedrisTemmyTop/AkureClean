require("dotenv").config();
const mongoose = require("mongoose");
const fs = require("fs");
const User = require("./src/models/User");

mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/akure_clean")
  .then(async () => {
    try {
      const users = await User.find({}, "name email role pollingUnit location").lean();
      
      const formattedUsers = users.map(u => ({
        name: u.name,
        email: u.email,
        role: u.role,
        pollingUnit: u.pollingUnit,
        // Since passwords are hashed in the DB, we display the standard test password
        password: "password123" 
      }));

      fs.writeFileSync("test_users.json", JSON.stringify(formattedUsers, null, 2));
      console.log(`Successfully exported ${users.length} users to test_users.json`);
      process.exit(0);
    } catch (err) {
      console.error("Error exporting users:", err);
      process.exit(1);
    }
  })
  .catch((err) => {
    console.error("Could not connect to MongoDB", err);
    process.exit(1);
  });
