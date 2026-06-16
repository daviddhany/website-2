require('dotenv').config();
const mongoose = require('mongoose');
const Student = require('./models/Student');
const Teacher = require('./models/Teacher');
const { normalizeClassName, normalizeStudentYear } = require('./utils');

async function normalizeModel(Model, label) {
  const docs = await Model.find({});
  let changed = 0;

  for (const doc of docs) {
    const beforeClass = doc.className || doc.assignedClass;
    const beforeYear = doc.studentYear || doc.assignedYear;
    const afterClass = normalizeClassName(beforeClass);
    const afterYear = normalizeStudentYear(beforeYear);

    let dirty = false;
    if (doc.className !== undefined && beforeClass !== afterClass) {
      doc.className = afterClass;
      dirty = true;
    }
    if (doc.assignedClass !== undefined && beforeClass !== afterClass) {
      doc.assignedClass = afterClass;
      dirty = true;
    }
    if (doc.studentYear !== undefined && beforeYear !== afterYear) {
      doc.studentYear = afterYear;
      dirty = true;
    }
    if (doc.assignedYear !== undefined && beforeYear !== afterYear) {
      doc.assignedYear = afterYear;
      dirty = true;
    }

    if (dirty) {
      await doc.save();
      changed++;
    }
  }

  console.log(`${label}: normalized ${changed} records`);
}

async function main() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/school_activity_app';
  await mongoose.connect(mongoUri);
  await normalizeModel(Student, 'Students');
  await normalizeModel(Teacher, 'Teachers');
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
