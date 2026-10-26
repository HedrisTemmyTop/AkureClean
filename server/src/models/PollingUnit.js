const mongoose = require("mongoose");

const pollingUnitSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    wardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ward",
      required: true,
    },
    localGovtId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LocalGovt",
      required: true,
    },
    wardName: {
      type: String,
      required: true,
      trim: true,
    },
    localGovtName: {
      type: String,
      required: true,
      trim: true,
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

pollingUnitSchema.index({ wardId: 1, name: 1 }, { unique: true });
pollingUnitSchema.index({ localGovtId: 1, wardId: 1 });

const PollingUnit = mongoose.model("PollingUnit", pollingUnitSchema);
module.exports = PollingUnit;
