require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');

require('../models/User');
const Donor = require('../models/Donor');

// Coordinates are [longitude, latitude] around Dhaka
const donors = [
  { name: 'Rahim Uddin',    email: 'rahim@test.com',   phone: '01711111111', bloodGroup: 'O+',  dateOfBirth: '1998-05-12', gender: 'male',   weightKg: 68, coords: [90.4125, 23.8103], area: 'Dhanmondi' },
  { name: 'Karim Ali',      email: 'karim@test.com',   phone: '01722222222', bloodGroup: 'A-',  dateOfBirth: '2005-01-20', gender: 'male',   weightKg: 45, coords: [90.3654, 23.8223], area: 'Mohammadpur', lastDonationDate: '2026-06-01' },
  { name: 'Nusrat Jahan',   email: 'nusrat@test.com',  phone: '01733333333', bloodGroup: 'B+',  dateOfBirth: '1995-08-30', gender: 'female', weightKg: 58, coords: [90.4074, 23.7936], area: 'Kalabagan' },
  { name: 'Tanvir Hasan',   email: 'tanvir@test.com',  phone: '01744444444', bloodGroup: 'O-',  dateOfBirth: '1992-03-15', gender: 'male',   weightKg: 75, coords: [90.4203, 23.7808], area: 'Shahbagh' },
  { name: 'Sadia Rahman',   email: 'sadia@test.com',   phone: '01755555555', bloodGroup: 'AB+', dateOfBirth: '2000-11-02', gender: 'female', weightKg: 54, coords: [90.4267, 23.7500], area: 'Motijheel' },
  { name: 'Imran Chowdhury',email: 'imran@test.com',   phone: '01766666666', bloodGroup: 'A+',  dateOfBirth: '1988-07-19', gender: 'male',   weightKg: 82, coords: [90.3938, 23.8759], area: 'Uttara' },
  { name: 'Farhana Akter',  email: 'farhana@test.com', phone: '01777777777', bloodGroup: 'B-',  dateOfBirth: '1997-12-05', gender: 'female', weightKg: 49, coords: [90.4152, 23.7461], area: 'Gulistan' },
  { name: 'Shakib Mahmud',  email: 'shakib@test.com',  phone: '01788888888', bloodGroup: 'O+',  dateOfBirth: '1994-02-28', gender: 'male',   weightKg: 70, coords: [90.4348, 23.7925], area: 'Gulshan', lastDonationDate: '2026-01-10' },
  { name: 'Mehjabin Kabir', email: 'mehjabin@test.com',phone: '01799999999', bloodGroup: 'AB-', dateOfBirth: '1958-04-11', gender: 'female', weightKg: 60, coords: [90.3711, 23.7639], area: 'Lalbagh' },
  { name: 'Arif Hossain',   email: 'arif@test.com',    phone: '01700000000', bloodGroup: 'A+',  dateOfBirth: '2001-09-23', gender: 'male',   weightKg: 66, coords: [90.4489, 23.8223], area: 'Badda', isAvailable: false }
];

const seed = async () => {
  await connectDB();

  const emails = donors.map((d) => d.email);
  const removed = await Donor.deleteMany({ email: { $in: emails } });
  console.log(`Removed ${removed.deletedCount} existing seed donor(s)`);

  // Donor.create() runs the password-hashing pre-save hook; insertMany would skip it
  const created = await Donor.create(
    donors.map((d) => ({
      name: d.name,
      email: d.email,
      phone: d.phone,
      password: 'secret123',
      bloodGroup: d.bloodGroup,
      dateOfBirth: d.dateOfBirth,
      gender: d.gender,
      weightKg: d.weightKg,
      lastDonationDate: d.lastDonationDate || null,
      isAvailable: d.isAvailable !== undefined ? d.isAvailable : true,
      location: { type: 'Point', coordinates: d.coords, address: d.area + ', Dhaka' }
    }))
  );

  console.log(`Seeded ${created.length} donors:`);
  created.forEach((d) => console.log(`  ${d._id}  ${d.bloodGroup.padEnd(3)}  ${d.name}`));

  await mongoose.connection.close();
  process.exit(0);
};

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});