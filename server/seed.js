const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();
const User = require('./src/models/User');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/akure_clean');

async function seed() {
  const users = [
    { name: 'Admin User', email: 'admin@example.com', password: 'securepassword123', role: 'admin', phone: '08000000000' },
    { name: 'Driver User', email: 'driver@example.com', password: 'securepassword123', role: 'driver', phone: '08000000001' },
    { name: 'Resident User', email: 'resident01@akureclean.test', password: 'test1234', role: 'resident', phone: '08000000002' }
  ];

  for (let u of users) {
    await User.deleteOne({ email: u.email });
    const hashedPassword = await bcrypt.hash(u.password, 12);
    await User.create({ ...u, password: hashedPassword });
    console.log(`Seeded ${u.email}`);
  }
  process.exit();
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
