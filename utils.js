const Student = require('./models/Student');

async function generateStudentCode(gender, className, studentYear) {
  const genderCode = gender === 'male' ? 'B' : 'G';

  const classCodes = {
    'خمسة و ستة': 'K',
    'إعدادي': 'E',
    'اعدادي': 'E',
    'يوحنا': 'Y',
    'ابوسيفين': 'S',
    'العذراء': 'M'
  };

  const classCode = classCodes[className];

  const yearCodes = {
    'اولى إبتدائي': '1',
    'تانية إبتدائي': '2',
    'ثالثة إبتدائي': '3',
    'رابعة إبتدائي': '4',
    'خمسة إبتدائي': '5',
    'سادسة إبتدائي': '6',
    'اولى اعدادي': '7',
    'تانية اعدادي': '8',
    'ثالثة اعدادي': '9',
    'اولى إعدادي': '7',
    'تانية إعدادي': '8',
    'ثالثة إعدادي': '9'
  };

  const yearCode = yearCodes[studentYear] || '0';

  if (!classCode) {
    throw new Error('Invalid class name');
  }

  const year = new Date().getFullYear();
  const prefix = `${genderCode}${classCode}${yearCode}-${year}-`;

  const students = await Student.find({
    studentCode: { $regex: `^${prefix}` }
  }).select('studentCode');

  const usedNumbers = students
    .map((s) => Number(s.studentCode.split('-').pop()))
    .filter((n) => Number.isInteger(n));

  let nextNumber = 1;

  while (usedNumbers.includes(nextNumber)) {
    nextNumber++;
  }

  const number = String(nextNumber).padStart(4, '0');

  return `${prefix}${number}`;
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
  normalizeArabicEducationValue
};
