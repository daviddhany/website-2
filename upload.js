function requireStudent(req, res, next) {
  if (!req.session || !req.session.userId || req.session.userType !== 'student') {
    return res.status(401).json({ error: 'Student login required' });
  }

  next();
}

function requireTeacher(req, res, next) {
  if (!req.session || !req.session.userId || req.session.userType !== 'teacher') {
    return res.status(401).json({ error: 'Teacher login required' });
  }

  next();
}

function requireAdmin(req, res, next) {
  if (
    !req.session ||
    !req.session.userId ||
    req.session.userType !== 'teacher' ||
    req.session.role !== 'admin'
  ) {
    return res.status(403).json({ error: 'Admin only' });
  }

  next();
}

module.exports = {
  requireStudent,
  requireTeacher,
  requireAdmin
};
