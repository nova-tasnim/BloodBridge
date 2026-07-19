require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');

require('../models/User');
const BloodBank = require('../models/BloodBank');

const seed = async () => {
  await connectDB();

  await BloodBank.deleteMany({ email: 'dcbb@test.com' });

  const bank = await BloodBank.create({
    name: 'Dhaka Central Blood Bank',
    email: 'dcbb@test.com',
    phone: '01900000000',
    password: 'secret123',
    licenseNumber: 'BB-DHK-2024-117',
    operatingHours: '24/7',
    contactPerson: 'Dr. Salma Khatun',
    location: {
      type: 'Point',
      coordinates: [90.4074, 23.7936],
      address: 'Kalabagan, Dhaka'
    }
  });

  console.log('Blood bank created:');
  console.log(`  ${bank._id}  ${bank.name}`);

  await mongoose.connection.close();
  process.exit(0);
};

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});