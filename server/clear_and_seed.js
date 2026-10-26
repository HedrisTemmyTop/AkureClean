require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("./src/models/User");
const Household = require("./src/models/Household");
const Assignment = require("./src/models/Assignment");
const PickupRequest = require("./src/models/PickupRequest");
const Report = require("./src/models/Report");
const Notification = require("./src/models/Notification");
const Zone = require("./src/models/Zone");

mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/akure_clean")
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => {
    console.error("Could not connect to MongoDB", err);
    process.exit(1);
  });

const NUM_RESIDENTS = 15;

const seed = async () => {
  try {
    // 1. Clear the DB
    console.log("Clearing collections...");
    await User.deleteMany({});
    await Household.deleteMany({});
    await Assignment.deleteMany({});
    await PickupRequest.deleteMany({});
    await Report.deleteMany({});
    await Notification.deleteMany({});
    await Zone.deleteMany({});
    console.log("Collections cleared!");

    // 2. Create Admin and Driver
    const hashedPassword = await bcrypt.hash("securepassword123", 12);
    await User.create({
      name: "Admin User",
      email: "admin@example.com",
      password: hashedPassword,
      role: "admin",
      phone: "08000000000",
    });
    
    // We'll give the driver a location as well to be sure they can be assigned
    await User.create({
      name: "Driver User",
      email: "driver@example.com",
      password: hashedPassword,
      role: "driver",
      phone: "08000000001",
      location: {
        type: "Point",
        coordinates: [5.138, 7.303], // Roughly in the FUTA area
      },
    });
    console.log("Created Admin and Driver (password: securepassword123)");

    // 3. Create 15 Residents near each other
    const residentPassword = await bcrypt.hash("password123", 12);
    
    // Bounds around FUTA Gate / Akindeko Hall
    const minLng = 5.134;
    const maxLng = 5.141;
    const minLat = 7.301;
    const maxLat = 7.306;

    for (let i = 1; i <= NUM_RESIDENTS; i++) {
      const lng = minLng + Math.random() * (maxLng - minLng);
      const lat = minLat + Math.random() * (maxLat - minLat);

      const user = await User.create({
        name: `FUTA Resident ${i}`,
        email: `futa${i}@example.com`,
        password: residentPassword,
        phone: `080${Math.floor(10000000 + Math.random() * 90000000)}`,
        role: "resident",
        address: `Block ${i}, Akindeko Hall, FUTA`,
        houseDescription: "Hostel building",
        localGovt: "Akure South",
        ward: "FUTA Ward",
        pollingUnit: "FUTA Gate",
        location: {
          type: "Point",
          coordinates: [lng, lat],
        },
        houseType: "Residential building",
        numberOfRooms: 1,
      });

      await Household.create({
        userId: user._id,
        ward: user.ward,
        localGovt: user.localGovt,
        pollingUnit: user.pollingUnit,
        houseType: user.houseType,
        numberOfRooms: user.numberOfRooms,
        address: user.address,
        location: user.location,
      });

      console.log(`Created resident ${i} at [${lng.toFixed(5)}, ${lat.toFixed(5)}]`);
    }

    console.log(`Successfully seeded ${NUM_RESIDENTS} residents around FUTA.`);
    console.log(`Resident emails: futa1@example.com to futa15@example.com (password: password123)`);
    process.exit(0);
  } catch (err) {
    console.error("Error seeding:", err);
    process.exit(1);
  }
};

seed();
