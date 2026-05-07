const mongoose = require("mongoose");
// Update this to point to your actual User model file
const User = require("./src/models/User.js");
// 1. Helper function to generate a random date between a start and end date
// 1. Helper function to generate a random date between a start and end date
function getRandomDate(start, end) {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime()),
  );
}

// 2. Set our specific boundaries
const today = new Date();

const oneYearAgo = new Date();
oneYearAgo.setFullYear(today.getFullYear() - 1);

const twoMonthsAgo = new Date();
twoMonthsAgo.setMonth(today.getMonth() - 2);
// 3. Array containing all 15 resident emails
const residentEmails = [
  "resident01@akureclean.test",
  "resident02@akureclean.test",
  "resident03@akureclean.test",
  "resident04@akureclean.test",
  "resident05@akureclean.test",
  "resident06@akureclean.test",
  "resident07@akureclean.test",
  "resident08@akureclean.test",
  "resident09@akureclean.test",
  "resident10@akureclean.test",
  "resident11@akureclean.test",
  "resident12@akureclean.test",
  "resident13@akureclean.test",
  "resident14@akureclean.test",
  "resident15@akureclean.test",
];

async function runRandomDateMigration() {
  try {
    const MONGODB_URI = "mongodb://localhost:27017/akure_clean";

    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected successfully.");

    // 4. Create the bulk operations using the randomizer
    const bulkOps = residentEmails.map((email) => {
      // Generate a fresh random date for this specific user
      const randomPastDate = getRandomDate(oneYearAgo, today);

      return {
        updateOne: {
          filter: { email: email },
          update: {
            $set: {
              createdAt: randomPastDate,
              updatedAt: randomPastDate,
            },
          },
        },
      };
    });

    console.log(`Executing ${bulkOps.length} random date updates...`);
    // Adding .collection bypasses Mongoose and talks directly to the native MongoDB driver
    const result = await User.collection.bulkWrite(bulkOps);
    console.log("Date randomization finished successfully! 🎲");
    console.log(`- Matched: ${result.matchedCount}`);
    console.log(`- Modified: ${result.modifiedCount}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Error during date randomization:", error);
    process.exit(1);
  }
}

runRandomDateMigration();
