const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["admin", "driver", "resident"],
      default: "resident",
    },
    address: {
      type: String,
    },
    houseDescription: {
      type: String,
    },
    localGovt: {
      type: String,
    },
    ward: {
      type: String,
    },
    pollingUnit: {
      type: String,
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
      },
    },
    expoPushToken: {
      type: String,
    },
    houseType: {
      type: String,
      enum: ["Residential building", "Shop", "Company"],
    },
    numberOfRooms: {
      type: Number,
    },
    numberOfShops: {
      type: Number,
    },
    numberOfWorkersRange: {
      type: String,
      enum: ["0-10 workers", "11-50 workers", "51-100 workers", "101-500 workers", "500+ workers"],
    },
    truckPlateNumber: {
      type: String,
    },
    truckCapacity: {
      type: String,
    },
    isDeactivated: {
      type: Boolean,
      default: false,
    },
    deactivationReason: {
      type: String,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

userSchema.index({ location: "2dsphere" });

const User = mongoose.model("User", userSchema);
module.exports = User;
