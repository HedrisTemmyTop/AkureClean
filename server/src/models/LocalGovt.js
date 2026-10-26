const mongoose = require("mongoose");

const localGovtSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    state: {
      type: String,
      default: "Ondo",
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const LocalGovt = mongoose.model("LocalGovt", localGovtSchema);
module.exports = LocalGovt;
