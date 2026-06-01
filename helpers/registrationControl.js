const SystemSettings = require('../models/SystemSettings');

async function getSystemSettings() {
  let settings = await SystemSettings.findOne();

  if (!settings) {
    settings = await SystemSettings.create({ registrationOpen: true });
  }

  return settings;
}

function isRegistrationOpen(settings) {
  if (!settings) return true;
  if (!settings.registrationOpen) return false;
  if (settings.registrationClosesAt && new Date(settings.registrationClosesAt).getTime() <= Date.now()) {
    return false;
  }
  return true;
}

async function getEffectiveRegistrationSettings() {
  const settings = await getSystemSettings();
  const effectiveRegistrationOpen = isRegistrationOpen(settings);

  if (settings.registrationOpen && !effectiveRegistrationOpen) {
    settings.registrationOpen = false;
    await settings.save();
  }

  return {
    settings,
    effectiveRegistrationOpen
  };
}

async function requireRegistrationOpen(req, res, next) {
  try {
    const { effectiveRegistrationOpen } = await getEffectiveRegistrationSettings();

    if (!effectiveRegistrationOpen) {
      return res.status(403).json({
        error: 'تم إغلاق التسجيل حالياً بواسطة الإدارة'
      });
    }

    return next();
  } catch (err) {
    console.error('Registration guard error:', err);
    return res.status(500).json({ error: 'فشل التحقق من حالة التسجيل' });
  }
}

async function requireRegistrationOpenForNonAdmin(req, res, next) {
  try {
    if (req.session && req.session.role === 'admin') {
      return next();
    }

    return requireRegistrationOpen(req, res, next);
  } catch (err) {
    console.error('Registration non-admin guard error:', err);
    return res.status(500).json({ error: 'فشل التحقق من حالة التسجيل' });
  }
}

module.exports = {
  getSystemSettings,
  isRegistrationOpen,
  getEffectiveRegistrationSettings,
  requireRegistrationOpen,
  requireRegistrationOpenForNonAdmin
};
