const Student = require('./models/Student');

async function generateStudentCode(gender, className, entryYear) {
  const genderCode = gender === 'male' ? 'M' : 'F';

  const classCodes = {
    'يوحنا': 'A',
    'يوحنا الحبيب': 'A',
    'ابوسيفين': 'B',
    'ابو سيفين': 'B',
    'أبو سيفين': 'B',
    'العذراء': 'C',
    'خمسة و ستة': 'D',
    'إعدادي': 'E',
    'اعدادي': 'E'
  };

  const classCode = classCodes[className];
  const yearNumber = Number(entryYear);

  if (!classCode) {
    throw new Error('Invalid class name for student code');
  }

  if (!Number.isInteger(yearNumber) || yearNumber < 2000 || yearNumber > 2099) {
    throw new Error('Invalid entry year for student code');
  }

  const yearCode = String(yearNumber).slice(-2);
  const prefix = `${yearCode}${genderCode}${classCode}`;

  const students = await Student.find({
    studentCode: { $regex: `^${prefix}\\d{3}$` }
  }).select('studentCode');

  const usedNumbers = students
    .map((student) => Number(String(student.studentCode || '').slice(-3)))
    .filter((number) => Number.isInteger(number));

  let nextNumber = 1;

  while (usedNumbers.includes(nextNumber)) {
    nextNumber++;
  }

  const serial = String(nextNumber).padStart(3, '0');

  return `${prefix}${serial}`;
}

function normalizeClassName(value) {
  if (value === undefined || value === null) return value;
  const text = String(value).trim();
  if (['اعدادي', 'إعدادي', 'اعدادى', 'إعدادى'].includes(text)) return 'إعدادي';
  return text;
}

function normalizeStudentYear(value) {
  if (value === undefined || value === null) return value;
  return String(value)
    .trim()
    .replace(/إعدادي/g, 'اعدادي')
    .replace(/إعدادى/g, 'اعدادي')
    .replace(/اعدادى/g, 'اعدادي');
}

function getEntryYearFromStudentYear(studentYear) {
  const normalized = normalizeStudentYear(studentYear);
  const entryYearByStudentYear = {
    'اولى إبتدائي': 2025,
    'تانية إبتدائي': 2024,
    'ثالثة إبتدائي': 2023,
    'رابعة إبتدائي': 2022,
    'خمسة إبتدائي': 2021,
    'سادسة إبتدائي': 2020,
    'اولى اعدادي': 2019,
    'تانية اعدادي': 2018,
    'ثالثة اعدادي': 2017
  };

  return entryYearByStudentYear[normalized] || null;
}

function normalizeArabicEducationValue(value) {
  return normalizeStudentYear(value);
}

function requireFields(body, fields) {
  return fields.filter(
    (field) => !body[field] || String(body[field]).trim() === ''
  );
}

module.exports = {
  generateStudentCode,
  requireFields,
  normalizeClassName,
  normalizeStudentYear,
  getEntryYearFromStudentYear,
  normalizeArabicEducationValue
};
