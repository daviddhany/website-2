require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Teacher = require('./models/Teacher');

const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/school_activity_app';

async function seed() {
  await mongoose.connect(MONGODB_URI);

  const adminPhone = process.env.ADMIN_PHONE;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPhone || !adminPassword) {
    throw new Error('Set ADMIN_PHONE and ADMIN_PASSWORD in environment variables before running seed.');
  }

  if (!/^\d{11}$/.test(adminPhone)) {
    throw new Error('ADMIN_PHONE must be 11 digits.');
  }

  if (adminPassword.length < 12) {
    throw new Error('ADMIN_PASSWORD must be at least 12 characters.');
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await Teacher.updateOne(
    { phone: adminPhone },
    {
      $set: {
        fullName: 'Main Admin',
        phone: adminPhone,
        passwordHash,
        role: 'admin'
      }
    },
    { upsert: true }
  );

  console.log('Seed complete');
  console.log(`Admin phone: ${adminPhone}`);
  console.log('Admin password was read from ADMIN_PASSWORD and was not printed.');

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});