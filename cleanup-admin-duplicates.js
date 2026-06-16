require('dotenv').config();

const mongoose = require('mongoose');
const Teacher = require('./models/Teacher');

const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/school_activity_app';

async function cleanup() {
  await mongoose.connect(MONGODB_URI);

  const admins = await Teacher.find({ role: 'admin' }).sort({ phone: -1, createdAt: 1 });
  const idsToDelete = [];
  const seenPhones = new Set();
  const mainAdminPhone = process.env.ADMIN_PHONE;
  const mainAdmin = mainAdminPhone ? admins.find(a => a.phone === mainAdminPhone) : null;

  for (const admin of admins) {
    const phone = admin.phone || '';

    // Remove old broken Main Admin records with no phone when the real seeded admin exists.
    if (mainAdmin && !phone && admin.fullName === 'Main Admin') {
      idsToDelete.push(admin._id);
      continue;
    }

    // Remove duplicate admin accounts with the same phone, keeping the first one.
    if (phone) {
      if (seenPhones.has(phone)) {
        idsToDelete.push(admin._id);
      } else {
        seenPhones.add(phone);
      }
    }
  }

  if (idsToDelete.length) {
    await Teacher.deleteMany({ _id: { $in: idsToDelete } });
  }

  console.log(`Admin cleanup complete. Removed ${idsToDelete.length} duplicate/broken admin record(s).`);
  await mongoose.disconnect();
}

cleanup().catch(err => {
  console.error(err);
  process.exit(1);
});
