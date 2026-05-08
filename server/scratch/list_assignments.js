const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });
const Assignment = require('../src/models/Assignment');

async function listAssignments() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/akureclean');
    const assignments = await Assignment.find({}, { _id: 1, title: 1, status: 1 });
    console.log('Assignments in DB:');
    assignments.forEach(a => {
      console.log(`ID: ${a._id}, Title: ${a.title}, Status: ${a.status}`);
    });
  } catch (error) {
    console.error(error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

listAssignments();
