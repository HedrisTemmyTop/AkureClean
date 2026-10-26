const mongoose = require("mongoose");
const Assignment = require("./src/models/Assignment");
require("./src/models/Household");
require("./src/models/User");

mongoose.connect("mongodb://127.0.0.1:27017/akure_clean").then(async () => {
  const a = await Assignment.findOne().populate({
      path: "stops.householdId",
      populate: { path: "userId", select: "name phone email" }
    });
  if (a && a.stops.length > 0) {
    console.log(JSON.stringify(a.stops[0], null, 2));
  } else {
    console.log("No assignments with stops found.");
  }
  process.exit(0);
});
