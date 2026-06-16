require('dotenv').config();
const mongoose = require('mongoose');
const Activity = require('./models/Activity');
const Student = require('./models/Student');

async function main() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/school_activity_app';
  await mongoose.connect(mongoUri);

  await Activity.updateMany(
    { price: { $exists: false } },
    { $set: { price: 10 } }
  );

  await Activity.updateMany(
    { category: { $exists: false } },
    { $set: { category: 'spiritual' } }
  );

  await Student.updateMany(
    { paymentMethod: { $exists: false } },
    { $set: { paymentMethod: 'servant' } }
  );

  await Student.updateMany(
    { karazaQualified: { $exists: false } },
    { $set: { karazaQualified: false } }
  );

  console.log('Updated existing activities/students for new features.');
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
