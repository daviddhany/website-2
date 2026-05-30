const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    name: 'Mahragan Registration API',
    version: '1.1.0',
    description: 'Documented API for students, teachers, activities, teams, reports, and admin operations.',
    endpoints: [
      { method: 'POST', path: '/api/auth/student/login', description: 'Student login' },
      { method: 'POST', path: '/api/auth/teacher/login', description: 'Teacher/Admin login' },
      { method: 'POST', path: '/api/auth/logout', description: 'Logout current session' },
      { method: 'POST', path: '/api/students/register', description: 'Register a new student' },
      { method: 'GET', path: '/api/students/me', description: 'Get current student profile' },
      { method: 'GET', path: '/api/admin/students', description: 'Teacher/Admin students list with filters' },
      { method: 'GET', path: '/api/admin/analytics', description: 'Reports and analytics summary' },
      { method: 'GET', path: '/api/admin/export/students.csv', description: 'Export students report as CSV' },
      { method: 'GET', path: '/api/activities', description: 'List activities' },
      { method: 'POST', path: '/api/activities', description: 'Create activity, admin only' },
      { method: 'GET', path: '/api/categories', description: 'List categories' },
      { method: 'POST', path: '/api/categories', description: 'Create category, admin only' },
      { method: 'GET', path: '/api/teams', description: 'List teams' },
      { method: 'POST', path: '/api/teams', description: 'Create team' }
    ]
  });
});

module.exports = router;
