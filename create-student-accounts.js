const express = require('express');
const bcrypt = require('bcryptjs');
const Teacher = require('../models/Teacher');
const { requireAdmin } = require('../middleware/auth');
const { normalizeClassName, normalizeStudentYear } = require('../utils');

const router = express.Router();

router.get('/', requireAdmin, async (req, res) => {
  const search = String(req.query.search || '').trim();
const filter = { role: { $in: ['admin', 'teacher', 'serviceLeader'] } };
  if (search) {
    filter.$or = [
      { fullName: new RegExp(search, 'i') },
      { phone: new RegExp(search, 'i') },
      { assignedClass: new RegExp(search, 'i') },
      { assignedYear: new RegExp(search, 'i') }
    ];
  }

  const teachers = await Teacher.find(filter).select('-passwordHash').sort({ role: 1, assignedClass: 1, assignedYear: 1, fullName: 1 });
  res.json(teachers);
});

router.post('/', requireAdmin, async (req, res) => {
  const {
    fullName,
    phone,
    password,
    assignedClass,
    assignedYear,
    assignedGender,
    role
  } = req.body;

  const teacherRole = ['admin', 'serviceLeader', 'teacher'].includes(role) ? role : 'teacher';

  if (!fullName || !phone || !password) {
    return res.status(400).json({
      error: 'من فضلك أكمل بيانات المستخدم'
    });
  }

  if (teacherRole !== 'admin' && (!assignedClass || !assignedGender || (teacherRole === 'teacher' && !assignedYear))) {
    return res.status(400).json({
      error: 'من فضلك أكمل بيانات الخادم'
    });
  }

  const normalizedAssignedClass = teacherRole === 'admin' ? undefined : normalizeClassName(assignedClass);
  const normalizedAssignedYear = teacherRole === 'teacher' && assignedYear ? normalizeStudentYear(assignedYear) : undefined;

  if (!/^\d{11}$/.test(phone)) {
    return res.status(400).json({
      error: 'رقم تليفون الخادم يجب أن يكون 11 رقم'
    });
  }

  const allowedClasses = [
    'خمسة و ستة',
    'إعدادي',
    'اعدادي',
    'يوحنا',
    'ابوسيفين',
    'العذراء'
  ];

  if (teacherRole !== 'admin' && !allowedClasses.includes(normalizedAssignedClass)) {
    return res.status(400).json({ error: 'الخدمة غير صحيحة' });
  }

  const allowedYears = [
    'اولى إبتدائي',
    'تانية إبتدائي',
    'ثالثة إبتدائي',
    'رابعة إبتدائي',
    'خمسة إبتدائي',
    'سادسة إبتدائي',
    'اولى اعدادي',
    'تانية اعدادي',
    'ثالثة اعدادي'
  ];

  if (teacherRole === 'teacher' && !allowedYears.includes(normalizedAssignedYear)) {
    return res.status(400).json({ error: 'السنة غير صحيحة' });
  }

  if (teacherRole !== 'admin' && !['male', 'female'].includes(assignedGender)) {
    return res.status(400).json({ error: 'النوع غير صحيح' });
  }

  const exists = await Teacher.findOne({ phone });

  if (exists) {
    return res.status(409).json({
      error: 'رقم تليفون الخادم موجود بالفعل'
    });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const teacherData = {
    fullName,
    phone,
    passwordHash,
    role: teacherRole
  };

  if (teacherRole !== 'admin') {
    teacherData.assignedClass = normalizedAssignedClass;
    teacherData.assignedYear = normalizedAssignedYear;
    teacherData.assignedGender = assignedGender;
  }

  const teacher = await Teacher.create(teacherData);

  res.status(201).json({
    message: 'تم إنشاء الخادم',
    teacher: {
      id: teacher._id,
      fullName: teacher.fullName,
      phone: teacher.phone,
      assignedClass: teacher.assignedClass,
      assignedYear: teacher.assignedYear,
      assignedGender: teacher.assignedGender,
      role: teacher.role
    }
  });
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const teacher = await Teacher.findById(req.params.id);

  if (!teacher) {
    return res.status(404).json({ error: 'المستخدم غير موجود' });
  }

  if (!['teacher', 'serviceLeader'].includes(teacher.role)) {
    return res.status(403).json({ error: 'لا يمكن حذف الأدمن من هنا' });
  }

  await Teacher.deleteOne({ _id: teacher._id });

  res.json({ message: 'تم حذف المستخدم' });
});

module.exports = router;
