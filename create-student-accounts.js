require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Student = require('./models/Student');

const MONGODB_URI = process.env.MONGODB_URI;
const DEFAULT_PASSWORD = '12345678'; // غيرها قبل التشغيل لو عايز

// اكتب بيانات المخدومين هنا
const students = [
  {
    studentCode: '24MA001',
    fullName: 'Example Student Name Four',
    gender: 'male',
    className: 'يوحنا',
    studentYear: 'ثالثة إبتدائي',
    entryYear: 2024,
    birthDate: '2016-05-01',
    parentPhone: '01234567890',
    studentPhone: '',
    address: 'Alexandria',
    paymentMethod: 'servant'
  }
];

async function run() {
  if (!MONGODB_URI) throw new Error('MONGODB_URI is missing');

  await mongoose.connect(MONGODB_URI);
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);

  for (const s of students) {
    await Student.updateOne(
      { studentCode: String(s.studentCode).trim().toUpperCase() },
      {
        $setOnInsert: {
          ...s,
          studentCode: String(s.studentCode).trim().toUpperCase(),
          passwordHash,
          mustChangePassword: true
        }
      },
      { upsert: true, runValidators: true }
    );
    console.log('created/skipped:', s.studentCode);
  }

  await mongoose.disconnect();
  console.log('Done');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
