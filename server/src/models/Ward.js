const mongoose = require("mongoose");

const wardSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    localGovtId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LocalGovt",
      required: true,
    },
    localGovtName: {
      type: String,
      required: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

wardSchema.index({ localGovtId: 1, name: 1 }, { unique: true });

const Ward = mongoose.model("Ward", wardSchema);
module.exports = Ward;
