const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const Assignment = require('../src/models/Assignment');

const assignmentId = '69fe1f131d270ad2a7cd0f78';

async function resetAssignment() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/akure_clean');
    console.log('Connected.');

    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      console.error('Assignment not found!');
      process.exit(1);
    }

    console.log(`Resetting assignment: ${assignment.title}`);
    
    // Update main status
    assignment.status = 'Pending';
    
    // Update each stop
    assignment.stops.forEach(stop => {
      stop.status = 'Pending';
      stop.collectedAt = null;
      stop.skipReason = null;
      stop.collectionNote = null;
    });

    await assignment.save();
    console.log('Assignment has been reset successfully!');

  } catch (error) {
    console.error('Error resetting assignment:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

resetAssignment();
