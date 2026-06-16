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
  if (['ابو سيفين', 'أبو سيفين', 'ابوسيفين'].includes(text)) return 'ابوسيفين';
  if (['يوحنا الحبيب', 'يوحنا'].includes(text)) return 'يوحنا';

  return text;
}

function getClassNameVariants(value) {
  const normalized = normalizeClassName(value);

  const variantsByClass = {
    'يوحنا': ['يوحنا', 'يوحنا الحبيب'],
    'ابوسيفين': ['ابوسيفين', 'ابو سيفين', 'أبو سيفين'],
    'العذراء': ['العذراء'],
    'خمسة و ستة': ['خمسة و ستة'],
    'إعدادي': ['إعدادي', 'اعدادي', 'اعدادى', 'إعدادى']
  };

  return variantsByClass[normalized] || [normalized].filter(Boolean);
}

function normalizeStudentYear(value) {
  if (value === undefined || value === null) return value;

  let year = String(value).trim();

  const map = {
    'أولى': 'اولى إبتدائي',
    'اولى': 'اولى إبتدائي',
    'أولى إبتدائي': 'اولى إبتدائي',
    'أولى ابتدائي': 'اولى إبتدائي',
    'اولى ابتدائي': 'اولى إبتدائي',

    'ثانية إبتدائي': 'تانية إبتدائي',
    'ثانية ابتدائي': 'تانية إبتدائي',
    'تانية ابتدائي': 'تانية إبتدائي',

    'خامسة إبتدائي': 'خمسة إبتدائي',
    'خامسة ابتدائي': 'خمسة إبتدائي',
    'خمسة ابتدائي': 'خمسة إبتدائي',

    'أولى إعدادي': 'اولى اعدادي',
    'أولى اعدادي': 'اولى اعدادي',
    'اولى إعدادي': 'اولى اعدادي'
  };

  year = map[year] || year;

  return year
    .replace(/إعدادي/g, 'اعدادي')
    .replace(/إعدادى/g, 'اعدادي')
    .replace(/اعدادى/g, 'اعدادي');
}

function getStudentYearVariants(value) {
  const normalized = normalizeStudentYear(value);

  const variantsByYear = {
    'اولى إبتدائي': ['اولى إبتدائي', 'أولى إبتدائي', 'اولى ابتدائي', 'أولى ابتدائي'],
    'تانية إبتدائي': ['تانية إبتدائي', 'تانية ابتدائي'],
    'ثالثة إبتدائي': ['ثالثة إبتدائي', 'ثالثة ابتدائي'],
    'رابعة إبتدائي': ['رابعة إبتدائي', 'رابعة ابتدائي'],
    'خمسة إبتدائي': ['خمسة إبتدائي', 'خامسة إبتدائي', 'خمسة ابتدائي', 'خامسة ابتدائي'],
    'سادسة إبتدائي': ['سادسة إبتدائي', 'سادسة ابتدائي'],
    'اولى اعدادي': ['اولى اعدادي', 'اولى إعدادي', 'أولى اعدادي', 'أولى إعدادي'],
    'تانية اعدادي': ['تانية اعدادي', 'تانية إعدادي'],
    'ثالثة اعدادي': ['ثالثة اعدادي', 'ثالثة إعدادي']
  };

  return variantsByYear[normalized] || [normalized].filter(Boolean);
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
  getClassNameVariants,
  getStudentYearVariants,
  getEntryYearFromStudentYear,
  normalizeArabicEducationValue
};
