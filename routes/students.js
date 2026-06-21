const express = require('express');
const bcrypt = require('bcryptjs');
const Student = require('../models/Student');
const Activity = require('../models/Activity');
const { getEffectiveRegistrationSettings, requireRegistrationOpen } = require('../helpers/registrationControl');
const { requireStudent } = require('../middleware/auth');
const { makeUpload } = require('../middleware/upload');
const {
  generateStudentCode,
  requireFields,
  normalizeClassName,
  normalizeStudentYear,
  getEntryYearFromStudentYear
} = require('../utils');

const router = express.Router();

function normalizeDuplicateText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ـ/g, '')
    .replace(/[ًٌٍَُِّْ]/g, '')
    .replace(/\s+/g, ' ');
}

function getBirthDateRange(dateValue) {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return { start, end };
}


const photoUpload = makeUpload('uploads/student-photos');
const birthUpload = makeUpload('uploads/birth-certificates');
const paymentUpload = makeUpload('uploads/payment-proofs');


router.get('/registration-status', async (req, res) => {
  const { settings, effectiveRegistrationOpen } = await getEffectiveRegistrationSettings();

  res.json({
    registrationOpen: effectiveRegistrationOpen,
    registrationClosesAt: settings.registrationClosesAt
      ? settings.registrationClosesAt.toISOString()
      : null
  });
});

router.post('/register', async (req, res) => {
  try {

    const { effectiveRegistrationOpen } = await getEffectiveRegistrationSettings();

    if (!effectiveRegistrationOpen) {
      return res.status(403).json({
        error: 'تم إغلاق التسجيل حالياً بواسطة الإدارة'
      });
    }

    const needed = [
      'fullName',
      'gender',
      'className',
      'studentYear',
      'birthDate',
      'password',
      'parentPhone',
      'address'
    ];

    const missing = requireFields(req.body, needed);

    if (missing.length) {
      return res.status(400).json({
        error: `من فضلك أكمل البيانات المطلوبة: ${missing.join(', ')}`
      });
    }

    if (String(req.body.fullName).trim().split(/\s+/).length < 3) {
      return res.status(400).json({
        error: 'الاسم يجب أن يكون ثلاثي'
      });
    }

    if (!/^\d{11}$/.test(req.body.parentPhone)) {
      return res.status(400).json({
        error: 'رقم ولي الأمر يجب أن يكون 11 رقم'
      });
    }

    if (req.body.studentPhone && !/^\d{11}$/.test(req.body.studentPhone)) {
      return res.status(400).json({
        error: 'رقم تليفون المخدوم يجب أن يكون 11 رقم'
      });
    }

    const className = normalizeClassName(req.body.className);

    const studentYear = normalizeStudentYear(
      req.body.studentYear
    );

    const entryYear = getEntryYearFromStudentYear(studentYear);

    if (!entryYear) {
      return res.status(400).json({
        error: 'السنة الدراسية غير صحيحة'
      });
    }

    const allowedYearsByClass = {
      'يوحنا': ['اولى إبتدائي', 'تانية إبتدائي', 'ثالثة إبتدائي', 'رابعة إبتدائي'],
      'ابوسيفين': ['اولى إبتدائي', 'تانية إبتدائي', 'ثالثة إبتدائي', 'رابعة إبتدائي'],
      'العذراء': ['اولى إبتدائي', 'تانية إبتدائي', 'ثالثة إبتدائي', 'رابعة إبتدائي'],
      'خمسة و ستة': ['خمسة إبتدائي', 'سادسة إبتدائي'],
      'إعدادي': ['اولى اعدادي', 'تانية اعدادي', 'ثالثة اعدادي']
    };

    if (!allowedYearsByClass[className] || !allowedYearsByClass[className].includes(studentYear)) {
      return res.status(400).json({
        error: 'السنة المختارة لا تناسب الخدمة المختارة'
      });
    }

    const birthDateRange = getBirthDateRange(req.body.birthDate);

    if (!birthDateRange) {
      return res.status(400).json({
        error: 'تاريخ الميلاد غير صحيح'
      });
    }

    const studentFingerprint = Student.buildFingerprint({
      fullName: req.body.fullName,
      birthDate: req.body.birthDate,
      className,
      studentYear
    });

    const possibleDuplicateStudents = await Student.find({
      className,
      studentYear,
      birthDate: {
        $gte: birthDateRange.start,
        $lt: birthDateRange.end
      }
    }).select('fullName studentCode studentFingerprint');

    const normalizedNewName = normalizeDuplicateText(req.body.fullName);

    const duplicateStudent = possibleDuplicateStudents.find((student) => {
      return (
        student.studentFingerprint === studentFingerprint ||
        normalizeDuplicateText(student.fullName) === normalizedNewName
      );
    });

    if (duplicateStudent) {
      return res.status(409).json({
        error: `هذا المخدوم مسجل بالفعل بكود ${duplicateStudent.studentCode}`
      });
    }

    const passwordHash = await bcrypt.hash(
      req.body.password,
      12
    );

    const studentCode = await generateStudentCode(
      req.body.gender,
      className,
      entryYear
    );


    const student = await Student.create({
      studentCode,
      fullName: req.body.fullName,
      gender: req.body.gender,
      className,
      studentYear,
      entryYear,
      birthDate: req.body.birthDate,
      studentPhone: req.body.studentPhone || '',
      passwordHash,
      parentPhone: req.body.parentPhone,
      address: req.body.address,
      studentFingerprint
    });

    res.status(201).json({
      message: 'Student registered',
      studentCode: student.studentCode,
      student: {
        studentCode: student.studentCode,
        fullName: student.fullName,
        gender: student.gender,
        className: student.className,
        studentYear: student.studentYear,
        entryYear: student.entryYear,
        birthDate: student.birthDate ? student.birthDate.toISOString().slice(0, 10) : '',
        parentPhone: student.parentPhone,
        studentPhone: student.studentPhone,
        address: student.address
      }
    });

  } catch (err) {

    if (err.code === 11000) {
      const duplicatedField = err.keyPattern ? Object.keys(err.keyPattern)[0] : 'field';
      return res.status(409).json({
        error: duplicatedField === 'studentCode'
          ? 'كود المخدوم موجود بالفعل'
          : duplicatedField === 'studentFingerprint'
            ? 'هذا المخدوم مسجل بالفعل'
            : `بيانات متكررة في قاعدة البيانات: ${duplicatedField}`
      });
    }

    console.error(err);

    res.status(500).json({
      error: 'فشل إنشاء الحساب. من فضلك راجع البيانات وحاول مرة أخرى'
    });
  }
});

router.get('/me', requireStudent, async (req, res) => {
  try {

    const student = await Student.findById(
      req.session.userId
    )
      .select('-passwordHash')
      .populate('activities');

    res.json(student);

  } catch (err) {

    res.status(500).json({
      error: 'فشل تحميل بيانات المخدوم'
    });
  }
});

router.put('/me', requireStudent, requireRegistrationOpen, async (req, res) => {
  try {

    const allowed = [
      'fullName',
      'parentPhone',
      'studentPhone',
      'address',
      'birthDate'
    ];

    const updates = {};

    allowed.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    if (
      updates.fullName &&
      String(updates.fullName).trim().split(/\s+/).length < 3
    ) {
      return res.status(400).json({
        error: 'الاسم يجب أن يكون ثلاثي'
      });
    }

    if (
      updates.parentPhone &&
      !/^\d{11}$/.test(updates.parentPhone)
    ) {
      return res.status(400).json({
        error: 'رقم ولي الأمر يجب أن يكون 11 رقم'
      });
    }

    if (
      updates.studentPhone &&
      !/^\d{11}$/.test(updates.studentPhone)
    ) {
      return res.status(400).json({
        error: 'رقم تليفون المخدوم يجب أن يكون 11 رقم'
      });
    }

    const currentStudent = await Student.findById(req.session.userId);

    if (!currentStudent) {
      return res.status(404).json({
        error: 'المخدوم غير موجود'
      });
    }

    if (updates.fullName || updates.birthDate) {
      const nextFullName = updates.fullName || currentStudent.fullName;
      const nextBirthDate = updates.birthDate || currentStudent.birthDate;
      const nextFingerprint = Student.buildFingerprint({
        fullName: nextFullName,
        birthDate: nextBirthDate,
        className: currentStudent.className,
        studentYear: currentStudent.studentYear
      });

      const birthDateRange = getBirthDateRange(nextBirthDate);

      if (!birthDateRange) {
        return res.status(400).json({
          error: 'تاريخ الميلاد غير صحيح'
        });
      }

      const possibleDuplicateStudents = await Student.find({
        _id: { $ne: currentStudent._id },
        className: currentStudent.className,
        studentYear: currentStudent.studentYear,
        birthDate: {
          $gte: birthDateRange.start,
          $lt: birthDateRange.end
        }
      }).select('fullName studentCode studentFingerprint');

      const normalizedNextName = normalizeDuplicateText(nextFullName);

      const duplicateStudent = possibleDuplicateStudents.find((student) => {
        return (
          student.studentFingerprint === nextFingerprint ||
          normalizeDuplicateText(student.fullName) === normalizedNextName
        );
      });

      if (duplicateStudent) {
        return res.status(409).json({
          error: `هذا المخدوم مسجل بالفعل بكود ${duplicateStudent.studentCode}`
        });
      }

      updates.studentFingerprint = nextFingerprint;
    }

    const student = await Student.findByIdAndUpdate(
      req.session.userId,
      updates,
      {
        new: true,
        runValidators: true
      }
    ).select('-passwordHash -studentFingerprint');

    res.json(student);

  } catch (err) {

    if (err.code === 11000) {
      return res.status(409).json({
        error: 'هذا المخدوم مسجل بالفعل'
      });
    }

    res.status(500).json({
      error: 'فشل تعديل بيانات المخدوم'
    });
  }
});

router.post(
  '/me/upload/student-photo',
  requireStudent,
  requireRegistrationOpen,
  photoUpload.single('file'),

  async (req, res) => {
    try {

      if (!req.file) {
        return res.status(400).json({
          error: 'الصورة الشخصية مطلوبة'
        });
      }

      await Student.findByIdAndUpdate(
        req.session.userId,
        {
          studentPhotoPath: req.file.path
        }
      );

      res.json({
        message: 'تم رفع الصورة الشخصية'
      });

    } catch (err) {

      console.error(err);

      res.status(500).json({
        error: 'فشل رفع الصورة الشخصية'
      });
    }
  }
);

router.post(
  '/me/upload/birth-certificate',
  requireStudent,
  requireRegistrationOpen,
  birthUpload.single('file'),

  async (req, res) => {
    try {

      if (!req.file) {
        return res.status(400).json({
          error: 'الملف مطلوب'
        });
      }

      await Student.findByIdAndUpdate(
        req.session.userId,
        {
          birthCertificatePath: req.file.path.endsWith('.pdf')
            ? req.file.path.replace('/image/upload/', '/raw/upload/fl_inline/')
            : req.file.path
        }
      );

      res.json({
        message: 'تم رفع شهادة الميلاد'
      });

    } catch (err) {

      console.error(err);

      res.status(500).json({
        error: 'فشل رفع شهادة الميلاد'
      });
    }
  }
);

router.post(
  '/me/upload/payment-proof',
  requireStudent,
  requireRegistrationOpen,
  paymentUpload.single('file'),

  async (req, res) => {
    try {

      if (!req.file) {
        return res.status(400).json({
          error: 'الملف مطلوب'
        });
      }

      await Student.findByIdAndUpdate(
        req.session.userId,
        {
          paymentProofPath: req.file.path
        }
      );

      res.json({
        message: 'تم رفع إيصال الدفع'
      });

    } catch (err) {

      console.error(err);

      res.status(500).json({
        error: 'فشل رفع إيصال الدفع'
      });
    }
  }
);

router.get('/me/activities', requireStudent, async (req, res) => {
  try {

    const student = await Student.findById(
      req.session.userId
    ).select('activities');

    const activities = await Activity.find({
      isActive: true
    }).sort('name');

    res.json({
      selected: student.activities.map(String),
      activities
    });

  } catch (err) {

    res.status(500).json({
      error: 'فشل تحميل الأنشطة'
    });
  }
});

router.put('/me/activities', requireStudent, requireRegistrationOpen, async (req, res) => {
  try {

    const student = await Student.findById(
      req.session.userId
    );

    const activityIds = Array.isArray(req.body.activityIds)
      ? req.body.activityIds
      : [];

    if (activityIds.length === 0) {
      return res.status(400).json({
        error: 'من فضلك اختر نشاط واحد على الأقل'
      });
    }

    const valid = await Activity.find({
      _id: { $in: activityIds },
      isActive: true
    }).select('_id name category');

    const hasSportsActivity = valid.some((activity) => {
      const name = String(activity.name || '');
      const category = String(activity.category || '');
      return name.includes('رياضي') || category.includes('رياضي');
    });

    if (hasSportsActivity && !student.studentPhotoPath) {
      return res.status(400).json({
        error: 'يجب رفع الصورة الشخصية عند اختيار نشاط رياضي'
      });
    }

    if (hasSportsActivity && !student.birthCertificatePath) {
      return res.status(400).json({
        error: 'يجب رفع شهادة الميلاد عند اختيار نشاط رياضي'
      });
    }


    await Student.findByIdAndUpdate(
      req.session.userId,
      {
        activities: valid.map((a) => a._id),
        submissionComplete: true,
        submittedAt: new Date()
      }
    );

    res.json({
      message: 'تم إرسال التسجيل بنجاح'
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: 'فشل إرسال التسجيل'
    });
  }
});

module.exports = router;
