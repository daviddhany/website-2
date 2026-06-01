const express = require('express');
const Team = require('../models/Team');
const Activity = require('../models/Activity');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const { requireTeacher } = require('../middleware/auth');
const { requireRegistrationOpen } = require('../helpers/registrationControl');

const router = express.Router();

async function getTeacher(req) {
  return Teacher.findById(req.session.userId);
}

const LOWER_SERVICE_CLASSES = ['يوحنا', 'ابوسيفين', 'العذراء'];
const PREP_CLASSES = ['إعدادي', 'اعدادي'];

const PRIMARY_YEAR_GROUPS = [
  ['اولى إبتدائي', 'تانية إبتدائي'],
  ['ثالثة إبتدائي', 'رابعة إبتدائي'],
  ['خمسة إبتدائي', 'سادسة إبتدائي']
];

function yearGroupForTeams(year) {
  if (!year) return null;

  const normalizedYear = String(year).trim();
  const group = PRIMARY_YEAR_GROUPS.find((years) => years.includes(normalizedYear));

  return group || [normalizedYear];
}

function sameTeamScopeFilterForTeacher(teacher) {
  const filter = {};

  if (teacher.role === 'admin') {
    return filter;
  }

  if (teacher.assignedGender && teacher.assignedGender !== 'all') {
    filter.gender = teacher.assignedGender;
  }

  if (teacher.role === 'serviceLeader') {
    if (PREP_CLASSES.includes(teacher.assignedClass)) {
      filter.className = { $in: PREP_CLASSES };
    } else {
      filter.className = teacher.assignedClass;
    }
    return filter;
  }

  if (teacher.role === 'teacher') {
    if (teacher.assignedYear) {
      const yearGroup = yearGroupForTeams(teacher.assignedYear);
      filter.studentYear = yearGroup && yearGroup.length > 1
        ? { $in: yearGroup }
        : teacher.assignedYear;
    }

    // خادم ابتدائي يشوف مجموعة السنين المناسبة: أولى+تانية، تالتة+رابعة، خامسة+سادسة.
    if (LOWER_SERVICE_CLASSES.includes(teacher.assignedClass)) {
      filter.className = { $in: LOWER_SERVICE_CLASSES };
      return filter;
    }

    // خادم إعدادي يشوف نفس سنة إعدادي ونفس النوع في كل إعدادي، مع دعم الإملاءين.
    if (PREP_CLASSES.includes(teacher.assignedClass)) {
      filter.className = { $in: PREP_CLASSES };
      return filter;
    }

    filter.className = teacher.assignedClass;
  }

  return filter;
}

function buildTeacherStudentFilter(teacher, activityId) {
  return {
    activities: activityId,
    ...sameTeamScopeFilterForTeacher(teacher)
  };
}

function teamOwnerFilter(teacher, activityId) {
  return {
    activity: activityId,
    ...(teacher.role === 'admin' ? {} : { teacher: teacher._id })
  };
}

async function canAccessStudent(teacher, studentId, activityId) {
  const student = await Student.findById(studentId);

  if (!student) return false;

  const isRegisteredForActivity = student.activities.some(
    (id) => String(id) === String(activityId)
  );

  if (!isRegisteredForActivity) return false;
  if (teacher.role === 'admin') return true;

  const scopeFilter = sameTeamScopeFilterForTeacher(teacher);

  if (scopeFilter.gender && student.gender !== scopeFilter.gender) {
    return false;
  }

  if (scopeFilter.studentYear) {
    if (scopeFilter.studentYear.$in) {
      if (!scopeFilter.studentYear.$in.includes(student.studentYear)) {
        return false;
      }
    } else if (student.studentYear !== scopeFilter.studentYear) {
      return false;
    }
  }

  if (scopeFilter.className) {
    if (scopeFilter.className.$in) {
      return scopeFilter.className.$in.includes(student.className);
    }

    return student.className === scopeFilter.className;
  }

  return true;
}

async function validateStudents(teacher, studentIds, activityId) {
  for (const studentId of studentIds) {
    const allowed = await canAccessStudent(teacher, studentId, activityId);

    if (!allowed) {
      const err = new Error('لا يمكنك إضافة هذا المخدوم إلى هذا الفريق');
      err.status = 403;
      throw err;
    }
  }
}

async function removeStudentsFromOtherUnlockedTeams(teacher, activityId, currentTeamId, studentIds) {
  if (!studentIds.length) return;

  const lockedConflict = await Team.findOne({
    ...teamOwnerFilter(teacher, activityId),
    ...(currentTeamId ? { _id: { $ne: currentTeamId } } : {}),
    locked: true,
    students: { $in: studentIds }
  });

  if (lockedConflict) {
    const err = new Error('يوجد مخدوم داخل فريق مقفول بالفعل');
    err.status = 409;
    throw err;
  }

  const result = await Team.updateMany(
    {
      ...teamOwnerFilter(teacher, activityId),
      ...(currentTeamId ? { _id: { $ne: currentTeamId } } : {}),
      locked: { $ne: true },
      students: { $in: studentIds }
    },
    { $pull: { students: { $in: studentIds } } }
  );

  return result;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

router.get('/eligible-students', requireTeacher, async (req, res) => {
  try {
    const teacher = await getTeacher(req);
    const { activityId } = req.query;

    if (!activityId) {
      return res.status(400).json({ error: 'النشاط مطلوب' });
    }

    const filter = buildTeacherStudentFilter(teacher, activityId);

    const students = await Student.find(filter)
      .select('-passwordHash')
      .populate('activities')
      .sort('studentYear className fullName');

    res.json(students);
  } catch (err) {
    console.error('Eligible team students error:', err);
    res.status(500).json({ error: 'فشل تحميل المخدومين المتاحين للفريق' });
  }
});

router.get('/', requireTeacher, async (req, res) => {
  const teacher = await getTeacher(req);

  const filter = teacher.role === 'admin'
    ? {}
    : { teacher: teacher._id };

  if (req.query.activityId) {
    filter.activity = req.query.activityId;
  }

  const teams = await Team.find(filter)
    .populate('activity')
    .populate('students')
    .populate('teacher', 'fullName phone')
    .sort('name');

  res.json(teams);
});

router.get('/export/excel', requireTeacher, async (req, res) => {
  const teacher = await getTeacher(req);
  const filter = teacher.role === 'admin' ? {} : { teacher: teacher._id };

  if (req.query.activityId) {
    filter.activity = req.query.activityId;
  }

  const teams = await Team.find(filter)
    .populate('activity')
    .populate('students')
    .sort('name');

  const rows = [];
  teams.forEach((team) => {
    if (!team.students.length) {
      rows.push([team.activity?.name || '', team.name, team.locked ? 'Yes' : 'No', '', '', '', '', '']);
    }

    team.students.forEach((student) => {
      rows.push([
        team.activity?.name || '',
        team.name,
        team.locked ? 'Yes' : 'No',
        student.studentCode || '',
        student.fullName || '',
        student.studentYear || '',
        student.className || '',
        student.gender || ''
      ]);
    });
  });
  const htmlRows = rows.map((row) => `
    <tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>
  `).join('');

  res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="teams-report.xls"');
  res.send(`<!doctype html>
<html>
<head><meta charset="utf-8"></head>
<body>
  <table border="1">
    <thead>
      <tr>
        <th>Activity</th><th>Team</th><th>Locked</th><th>Student Code</th>
        <th>Student Name</th><th>Year</th><th>Class</th><th>Gender</th>
      </tr>
    </thead>
    <tbody>${htmlRows}</tbody>
  </table>
</body>
</html>`);
});

router.get('/export/pdf', requireTeacher, async (req, res) => {
  const teacher = await getTeacher(req);
  const filter = teacher.role === 'admin' ? {} : { teacher: teacher._id };

  if (req.query.activityId) {
    filter.activity = req.query.activityId;
  }

  const teams = await Team.find(filter)
    .populate('activity')
    .populate('students')
    .sort('name');

  const htmlRows = teams.map((team) => `
    <h2>${escapeHtml(team.activity?.name || '')} - ${escapeHtml(team.name)} ${team.locked ? '(Locked)' : ''}</h2>
    <table>
      <thead><tr><th>#</th><th>Code</th><th>Name</th><th>Year</th><th>Class</th><th>Gender</th></tr></thead>
      <tbody>
        ${team.students.map((student, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(student.studentCode || '')}</td>
            <td>${escapeHtml(student.fullName || '')}</td>
            <td>${escapeHtml(student.studentYear || '')}</td>
            <td>${escapeHtml(student.className || '')}</td>
            <td>${escapeHtml(student.gender || '')}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `).join('');

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Teams Report</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 24px; color: #172033; }
    h1 { margin-bottom: 4px; }
    h2 { margin-top: 28px; border-bottom: 1px solid #ddd; padding-bottom: 6px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; page-break-inside: avoid; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background: #f3f5f9; }
    @media print { button { display: none; } }
  </style>
</head>
<body>
  <button onclick="window.print()">Print / Save as PDF</button>
  <h1>Teams Report</h1>
  <p>Generated: ${new Date().toLocaleString()}</p>
  ${htmlRows || '<p>No teams found.</p>'}
  <script>setTimeout(() => window.print(), 400);</script>
</body>
</html>`);
});

async function generateTeamName(activityId, activityName, teacher) {
  const teacherName = teacher.fullName || teacher.phone || 'الخادم';

  const filter = teacher.role === 'admin'
    ? { activity: activityId, teacher: teacher._id }
    : { activity: activityId, teacher: teacher._id };

  let teamNumber = await Team.countDocuments(filter) + 1;
  let teamName = `${activityName} - فريق ${teamNumber} - ${teacherName}`;

  while (await Team.exists({ activity: activityId, teacher: teacher._id, name: teamName })) {
    teamNumber += 1;
    teamName = `${activityName} - فريق ${teamNumber} - ${teacherName}`;
  }

  return teamName;
}

router.post('/', requireTeacher, requireRegistrationOpen, async (req, res) => {
  try {
    const teacher = await getTeacher(req);
    const { activityId, studentIds = [] } = req.body;

    if (!activityId) {
      return res.status(400).json({ error: 'النشاط مطلوب' });
    }

    if (!Array.isArray(studentIds)) {
      return res.status(400).json({ error: 'قائمة المخدومين غير صحيحة' });
    }

    const activity = await Activity.findById(activityId);

    if (!activity) {
      return res.status(404).json({ error: 'النشاط غير موجود' });
    }

    await validateStudents(teacher, studentIds, activityId);
    await removeStudentsFromOtherUnlockedTeams(teacher, activityId, null, studentIds);

    const name = await generateTeamName(activityId, activity.name || 'نشاط', teacher);

    const team = await Team.create({
      name,
      activity: activityId,
      teacher: teacher._id,
      students: studentIds
    });

    const populatedTeam = await Team.findById(team._id)
      .populate('activity')
      .populate('students')
      .populate('teacher', 'fullName phone');

    res.status(201).json(populatedTeam);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'فشل إنشاء الفريق' });
  }
});

router.put('/:id/students', requireTeacher, requireRegistrationOpen, async (req, res) => {
  try {
    const teacher = await getTeacher(req);
    const { studentIds } = req.body;

    if (!Array.isArray(studentIds)) {
      return res.status(400).json({ error: 'قائمة المخدومين غير صحيحة' });
    }

    const team = await Team.findById(req.params.id);

    if (!team) {
      return res.status(404).json({ error: 'الفريق غير موجود' });
    }

    if (teacher.role !== 'admin' && String(team.teacher) !== String(teacher._id)) {
      return res.status(403).json({ error: 'غير مسموح' });
    }

    if (team.locked) {
      return res.status(423).json({ error: 'الفريق مقفول. افتحه قبل التعديل.' });
    }

    await validateStudents(teacher, studentIds, team.activity);
    await removeStudentsFromOtherUnlockedTeams(teacher, team.activity, team._id, studentIds);

    team.students = studentIds;
    await team.save();

    res.json({ message: 'تم تعديل الفريق' });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'فشل تعديل الفريق' });
  }
});

router.put('/:id/lock', requireTeacher, requireRegistrationOpen, async (req, res) => {
  const teacher = await getTeacher(req);
  const team = await Team.findById(req.params.id);

  if (!team) {
    return res.status(404).json({ error: 'الفريق غير موجود' });
  }

  if (teacher.role !== 'admin' && String(team.teacher) !== String(teacher._id)) {
    return res.status(403).json({ error: 'غير مسموح' });
  }

  team.locked = true;
  team.lockedAt = new Date();
  await team.save();

  res.json({ message: 'تم قفل الفريق' });
});

router.put('/:id/unlock', requireTeacher, requireRegistrationOpen, async (req, res) => {
  const teacher = await getTeacher(req);
  const team = await Team.findById(req.params.id);

  if (!team) {
    return res.status(404).json({ error: 'الفريق غير موجود' });
  }

  if (teacher.role !== 'admin' && String(team.teacher) !== String(teacher._id)) {
    return res.status(403).json({ error: 'غير مسموح' });
  }

  team.locked = false;
  team.lockedAt = null;
  await team.save();

  res.json({ message: 'تم فتح الفريق' });
});

router.delete('/:id', requireTeacher, requireRegistrationOpen, async (req, res) => {
  const teacher = await getTeacher(req);
  const team = await Team.findById(req.params.id);

  if (!team) {
    return res.status(404).json({ error: 'الفريق غير موجود' });
  }

  if (teacher.role !== 'admin' && String(team.teacher) !== String(teacher._id)) {
    return res.status(403).json({ error: 'غير مسموح' });
  }

  if (team.locked) {
    return res.status(423).json({ error: 'الفريق مقفول. افتحه قبل الحذف.' });
  }

  await Team.findByIdAndDelete(req.params.id);

  res.json({ message: 'تم حذف الفريق' });
});

module.exports = router;
