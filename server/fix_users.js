const mongoose = require("mongoose");
const User = require("./src/models/User");
const Household = require("./src/models/Household");

mongoose.connect("mongodb://127.0.0.1:27017/akure_clean").then(async () => {
  const newWard = "WARD 01  - APONMU";
  const newPU = "OLOUNTA/ OMOLOJU CAMP , AT OLOUNTA/ OMOLOJU";
  
  await User.updateMany({ role: "resident" }, { $set: { ward: newWard, pollingUnit: newPU } });
  await Household.updateMany({}, { $set: { ward: newWard, pollingUnit: newPU } });
  
  console.log("Updated 15 residents to Ward:", newWard, "and PU:", newPU);
  process.exit(0);
});
