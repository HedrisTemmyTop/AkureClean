const mongoose = require("mongoose");
const User = require("./src/models/User");

mongoose.connect("mongodb://127.0.0.1:27017/akure_clean").then(async () => {
  const users = await User.find({});
  console.log("Total users:", users.length);
  const residents = users.filter(u => u.role === 'resident');
  console.log("Residents:", residents.length);
  process.exit(0);
});
