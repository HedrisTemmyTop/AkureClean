const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
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
    enum: ['resident', 'driver', 'admin'],
    default: 'resident',
  },
  expoPushToken: {
    type: String,
  }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
module.exports = User;
