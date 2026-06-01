const express = require('express');
const Student = require('../models/Student');
const Activity = require('../models/Activity');
const Category = require('../models/Category');
const Teacher = require('../models/Teacher');
const Team = require('../models/Team');
const { requireTeacher, requireAdmin } = require('../middleware/auth');
const { getSystemSettings, getEffectiveRegistrationSettings, requireRegistrationOpenForNonAdmin } = require('../helpers/registrationControl');

const router = express.Router();


router.get('/registration-status', requireAdmin, async (req, res) => {
  const { settings, effectiveRegistrationOpen } = await getEffectiveRegistrationSettings();

  res.json({
    registrationOpen: effectiveRegistrationOpen,
    registrationClosesAt: settings.registrationClosesAt
      ? settings.registrationClosesAt.toISOString()
      : null
  });
});

router.post('/registration-status', requireAdmin, async (req, res) => {
  const settings = await getSystemSettings();
  const registrationOpen = Boolean(req.body.registrationOpen);
  let registrationClosesAt = null;

  if (req.body.registrationClosesAt) {
    const closeDate = new Date(req.body.registrationClosesAt);

    if (Number.isNaN(closeDate.getTime())) {
      return res.status(400).json({ error: 'وقت الإغلاق غير صحيح' });
    }

    if (registrationOpen && closeDate.getTime() <= Date.now()) {
      return res.status(400).json({ error: 'وقت الإغلاق يجب أن يكون في المستقبل' });
    }

    registrationClosesAt = closeDate;
  }

  settings.registrationOpen = registrationOpen;
  settings.registrationClosesAt = registrationOpen ? registrationClosesAt : null;
  await settings.save();

  const { settings: updatedSettings, effectiveRegistrationOpen } = await getEffectiveRegistrationSettings();

  res.json({
    registrationOpen: effectiveRegistrationOpen,
    registrationClosesAt: updatedSettings.registrationClosesAt
      ? updatedSettings.registrationClosesAt.toISOString()
      : null
  });
});

router.post('/activities', requireAdmin, async (req, res) => {
  const name = (req.body.name || '').trim();
  const description = (req.body.description || '').trim();
  const category = (req.body.category || '').trim();
  const price = Number.isFinite(Number(req.body.price)) ? Number(req.body.price) : 10;

  if (!name) {
    return res.status(400).json({ error: 'اسم النشاط مطلوب' });
  }

  if (!category) {
    return res.status(400).json({ error: 'تصنيف النشاط مطلوب' });
  }

  try {
    const selectedCategory = await Category.findOne({ name: category, isActive: true });

    if (!selectedCategory) {
      return res.status(400).json({ error: 'تصنيف النشاط غير موجود' });
    }

    const existingActivity = await Activity.findOne({ name });

    if (existingActivity) {
      return res.status(409).json({ error: 'هذا النشاط موجود بالفعل' });
    }

    const activity = await Activity.create({
      name,
      description,
      category,
      price,
      isActive: true
    });

    return res.json(activity);
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ error: 'هذا النشاط موجود بالفعل' });
    }

    console.error('Create activity error:', err);
    return res.status(500).json({ error: 'فشل إضافة النشاط. حاول مرة أخرى' });
  }
});

router.delete('/activities/:id', requireAdmin, async (req, res) => {
  await Activity.findByIdAndDelete(req.params.id);
  res.json({ message: 'Activity deleted' });
});

async function getStudentFilterForTeacher(req) {
  const currentTeacher = await Teacher.findById(req.session.userId);

  if (!currentTeacher) {
    return null;
  }

  const filter = {};

  if (currentTeacher.role === 'teacher') {
    if (currentTeacher.assignedClass) filter.className = currentTeacher.assignedClass;
    if (currentTeacher.assignedYear) filter.studentYear = currentTeacher.assignedYear;
    if (currentTeacher.assignedGender) filter.gender = currentTeacher.assignedGender;
  }

  if (currentTeacher.role === 'serviceLeader') {
    if (currentTeacher.assignedClass) filter.className = currentTeacher.assignedClass;
    if (currentTeacher.assignedGender) filter.gender = currentTeacher.assignedGender;
  }

  return { currentTeacher, filter };
}

router.get('/students', requireTeacher, async (req, res) => {
  const result = await getStudentFilterForTeacher(req);

  if (!result) {
    return res.status(401).json({ error: 'Teacher not found' });
  }

  const { filter } = result;

  const andFilters = [];

  if (req.query.search) {
    const q = new RegExp(req.query.search, 'i');

    andFilters.push({
      $or: [
        { fullName: q },
        { nationalId: q },
        { studentCode: q }
      ]
    });
  }

  if (req.query.activityId) {
    andFilters.push({ activities: req.query.activityId });
  }

  if (andFilters.length) {
    filter.$and = andFilters;
  }

  const students = await Student.find(filter)
    .select('-passwordHash')
    .populate('activities')
    .sort('-createdAt');

  res.json(students);
});

router.get('/students/:id', requireTeacher, async (req, res) => {
  const result = await getStudentFilterForTeacher(req);

  if (!result) {
    return res.status(401).json({ error: 'Teacher not found' });
  }

  const { filter } = result;

  const student = await Student.findOne({
    _id: req.params.id,
    ...filter
  })
    .select('-passwordHash')
    .populate('activities');

  if (!student) {
    return res.status(404).json({ error: 'Student not found or not allowed' });
  }

  res.json(student);
});


async function canTeacherAccessStudent(currentTeacher, student) {
  if (!currentTeacher || !student) return false;

  if (currentTeacher.role === 'admin') return true;

  if (currentTeacher.role === 'teacher') {
    return student.className === currentTeacher.assignedClass &&
      student.studentYear === currentTeacher.assignedYear &&
      student.gender === currentTeacher.assignedGender;
  }

  if (currentTeacher.role === 'serviceLeader') {
    return student.className === currentTeacher.assignedClass &&
      student.gender === currentTeacher.assignedGender;
  }

  return false;
}

router.put('/students/:id/payment-confirmation', requireTeacher, requireRegistrationOpenForNonAdmin, async (req, res) => {
  try {
    const currentTeacher = await Teacher.findById(req.session.userId);
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({ error: 'المخدوم غير موجود' });
    }

    const allowed = await canTeacherAccessStudent(currentTeacher, student);

    if (!allowed) {
      return res.status(403).json({ error: 'غير مسموح' });
    }

    student.paymentConfirmed = Boolean(req.body.paymentConfirmed);
    await student.save();

    res.json({
      message: student.paymentConfirmed ? 'تم تأكيد الدفع' : 'تم إلغاء تأكيد الدفع',
      paymentConfirmed: student.paymentConfirmed
    });
  } catch (err) {
    console.error('Payment confirmation error:', err);
    res.status(500).json({ error: 'فشل تحديث حالة الدفع' });
  }
});

router.put('/students/:id', requireTeacher, requireRegistrationOpenForNonAdmin, async (req, res) => {
  try {
    const Student = require('../models/Student');
    const Teacher = require('../models/Teacher');

    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({ error: 'المخدوم غير موجود' });
    }

    const currentTeacher = await Teacher.findById(req.session.userId);

    // 🔒 Restrict teacher access
    if (currentTeacher.role === 'teacher') {
      if (student.className !== currentTeacher.assignedClass || student.studentYear !== currentTeacher.assignedYear || student.gender !== currentTeacher.assignedGender) {
        return res.status(403).json({ error: 'غير مسموح' });
      }
    }

    if (currentTeacher.role === 'serviceLeader') {
      if (student.className !== currentTeacher.assignedClass || student.gender !== currentTeacher.assignedGender) {
        return res.status(403).json({ error: 'غير مسموح' });
      }
    }

    // ✅ Allowed fields only
    const allowedFields = [
      'fullName',
      'parentPhone',
      'studentPhone',
      'address',
      'birthDate'
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        student[field] = req.body[field];
      }
    }

    if (req.body.activityIds !== undefined) {
      const activityIds = Array.isArray(req.body.activityIds) ? req.body.activityIds : [];
      const validActivities = await Activity.find({ _id: { $in: activityIds }, isActive: true }).select('_id');
      const validIds = validActivities.map((activity) => activity._id);
      const validIdStrings = new Set(validIds.map(String));

      student.activities = validIds;

      // If a teacher removes an activity from a student, also remove that student from teams for that activity.
      await Team.updateMany(
        { activity: { $nin: validIds }, students: student._id },
        { $pull: { students: student._id } }
      );
    }

    await student.save();

    res.json({ message: 'Student updated successfully' });

  } catch (err) {
    res.status(500).json({ error: 'فشل التعديل' });
  }
});

router.delete('/students/:id', requireTeacher, requireRegistrationOpenForNonAdmin, async (req, res) => {
  const result = await getStudentFilterForTeacher(req);

  if (!result) {
    return res.status(401).json({ error: 'Teacher not found' });
  }

  const { filter } = result;

  const student = await Student.findOneAndDelete({
    _id: req.params.id,
    ...filter
  });

  if (!student) {
    return res.status(404).json({ error: 'Student not found or not allowed' });
  }

  res.json({ message: 'Student deleted' });
});

router.get('/export/students.csv', requireTeacher, async (req, res) => {
  const result = await getStudentFilterForTeacher(req);

  if (!result) {
    return res.status(401).json({ error: 'Teacher not found' });
  }

  const { filter } = result;

  const students = await Student.find(filter)
    .populate('activities')
    .sort('studentCode');

  const activities = await Activity.find({ isActive: true }).sort('category name');

  const fileLink = (filePath) => {
    if (!filePath) return '';

    if (/^https?:\/\//i.test(filePath)) {
      return filePath;
    }

    const cleanPath = String(filePath).replace(/^\/+/, '');
    const publicPath = cleanPath.startsWith('protected/')
      ? cleanPath
      : `protected/${cleanPath}`;

    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.get('host');

    return `${protocol}://${host}/${publicPath}`;
  };

  const activityHeaders = activities.map((activity) => activity.name);

  const header = [
    'Student Code',
    'Full Name',
    'Gender',
    'Birth Date',
    'Year',
    'Entry Year',
    'Class',
    'Parent Phone',
    'Student Phone',
    'Address',
    'Paid',
    'Student Photo Link',
    'Birth Certificate Link',
    'Submission Status',
    'Submitted At',
    'Created At',
    ...activityHeaders
  ];

  const escapeCsv = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const phoneText = (value) => value ? `\t${String(value)}` : '';

  const rows = students.map((s) => {
    const selectedActivities = new Set((s.activities || []).map((activity) => String(activity._id)));

    return [
      s.studentCode || '',
      s.fullName || '',
      s.gender === 'male' ? 'Male' : 'Female',
      s.birthDate ? s.birthDate.toISOString().slice(0, 10) : '',
      s.studentYear || '',
      s.entryYear || '',
      s.className || '',
      phoneText(s.parentPhone),
      phoneText(s.studentPhone),
      s.address || '',
      s.paymentConfirmed ? 'Yes' : 'No',
      fileLink(s.studentPhotoPath),
      fileLink(s.birthCertificatePath),
      s.submissionComplete ? 'Complete' : 'Incomplete',
      s.submittedAt ? s.submittedAt.toISOString() : '',
      s.createdAt ? s.createdAt.toISOString() : '',
      ...activities.map((activity) => selectedActivities.has(String(activity._id)) ? 'Yes' : '')
    ];
  });

  const csv = [header, ...rows]
    .map((row) => row.map(escapeCsv).join(','))
    .join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="students.csv"');
  res.send('\uFEFF' + csv);
});
const bcrypt = require('bcryptjs');

router.put('/students/:id/password', requireTeacher, requireRegistrationOpenForNonAdmin, async (req, res) => {
  try {
    const currentTeacher = await Teacher.findById(req.session.userId);
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({ error: 'المخدوم غير موجود' });
    }

    if (currentTeacher.role !== 'admin') {
      const allowed =
        student.className === currentTeacher.assignedClass &&
        student.studentYear === currentTeacher.assignedYear &&
        student.gender === currentTeacher.assignedGender;

      if (!allowed) {
        return res.status(403).json({ error: 'غير مسموح' });
      }
    }

    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ error: 'كلمة السر الجديدة مطلوبة' });
    }

    student.passwordHash = await bcrypt.hash(newPassword, 12);
    await student.save();

    res.json({ message: 'تم تغيير كلمة سر المخدوم' });
  } catch (err) {
    res.status(500).json({ error: 'فشل تغيير كلمة سر المخدوم' });
  }
});
module.exports = router;