const mongoose = require("mongoose");
const Assignment = require("./src/models/Assignment");
require("./src/models/Household");
require("./src/models/User");

mongoose.connect("mongodb://127.0.0.1:27017/akure_clean").then(async () => {
  const a = await Assignment.findOne()
    .populate("stops.userId", "name phone email");
  if (a && a.stops.length > 0) {
    console.log("userId is now populated:", a.stops[0].userId);
  }
  process.exit(0);
});
