const mongoose = require("mongoose");
const User = require("./src/models/User");

mongoose.connect("mongodb://127.0.0.1:27017/akure_clean").then(async () => {
  const admin = await User.findOne({ email: 'admin@example.com' });
  console.log(admin ? "Admin found: " + admin.email + " (Role: " + admin.role + ")" : "Admin not found!");
  process.exit(0);
});
