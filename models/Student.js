const mongoose = require('mongoose');

function normalizeFingerprintText(value) {
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

function normalizeFingerprintDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString().slice(0, 10);
}

function buildStudentFingerprint({ fullName, birthDate, className, studentYear }) {
  return [
    normalizeFingerprintText(fullName),
    normalizeFingerprintDate(birthDate),
    normalizeFingerprintText(className),
    normalizeFingerprintText(studentYear)
  ].join('|');
}


function normalizeStudentYearValue(value) {
  if (value === undefined || value === null) return value;

  const text = String(value)
    .trim()
    .replace(/^الأولى/, 'اولى')
    .replace(/^أولى/, 'اولى')
    .replace(/ابتدائي/g, 'إبتدائي')
    .replace(/إعدادي/g, 'اعدادي')
    .replace(/إعدادى/g, 'اعدادي')
    .replace(/اعدادى/g, 'اعدادي')
    .replace(/خامسة/g, 'خمسة');

  return text;
}

function normalizeClassNameValue(value) {
  if (value === undefined || value === null) return value;

  const text = String(value).trim();

  if (['اعدادي', 'إعدادي', 'اعدادى', 'إعدادى'].includes(text)) return 'إعدادي';
  if (['ابو سيفين', 'أبو سيفين', 'ابوسيفين'].includes(text)) return 'ابوسيفين';
  if (['يوحنا الحبيب', 'يوحنا'].includes(text)) return 'يوحنا';

  return text;
}

function normalizePhoneValue(value) {
  if (value === undefined || value === null) return value;

  const digits = String(value).replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10 && !digits.startsWith('0')) return `0${digits}`;
  return digits;
}

const studentSchema = new mongoose.Schema(
  {
    studentCode: { type: String, required: true, unique: true, trim: true },

    // Prevent registering the same student twice even if parent phone changes.
    studentFingerprint: {
      type: String,
      unique: true,
      sparse: true,
      index: true
    },

    // ✅ Full name (at least 3 names)
    fullName: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: function (v) {
          return String(v).trim().split(/\s+/).length >= 3;
        },
        message: 'Full name must contain at least 3 names'
      }
    },

    gender: { type: String, required: true, enum: ['male', 'female'] },

    // ✅ Updated classes
    className: {
      type: String,
      required: true,
      enum: ['خمسة و ستة', 'إعدادي', 'اعدادي', 'يوحنا', 'ابوسيفين', 'العذراء']
    },

    // ✅ Updated years (STRING now)
    studentYear: {
  type: String,
  required: true,
  set: normalizeStudentYearValue,
  enum: [
    'اولى إبتدائي',
    'أولى إبتدائي',
    'اولى ابتدائي',
    'أولى ابتدائي',
    'تانية إبتدائي',
    'تانية ابتدائي',
    'ثالثة إبتدائي',
    'ثالثة ابتدائي',
    'رابعة إبتدائي',
    'رابعة ابتدائي',
    'خمسة إبتدائي',
    'خامسة إبتدائي',
    'خمسة ابتدائي',
    'خامسة ابتدائي',
    'سادسة إبتدائي',
    'سادسة ابتدائي',
    'اولى اعدادي',
    'أولى اعدادي',
    'اولى إعدادي',
    'أولى إعدادي',
    'تانية اعدادي',
    'تانية إعدادي',
    'ثالثة اعدادي',
    'ثالثة إعدادي'
  ]
},
    entryYear: {
      type: Number,
      default: null,
      min: 2000,
      max: 2099
    },

    // ✅ Birthdate
    birthDate: {
      type: Date,
      required: true
    },
    // ✅ Parent phone (required)
    parentPhone: {
      type: String,
      required: true,
      match: [/^\d{11}$/, 'Phone number must be exactly 11 digits']
    },

    // ✅ Student phone (optional)
    studentPhone: {
      type: String,
      default: '',
      match: [/^$|^\d{11}$/, 'Student phone must be exactly 11 digits']
    },

    mustChangePassword: {
      type: Boolean,
      default: true
    },

    submissionComplete: {
      type: Boolean,
      default: false
    },

    submittedAt: {
      type: Date,
      default: null
    },

    passwordHash: { type: String, required: true },

    address: { type: String, required: true, trim: true },

    studentPhotoPath: { type: String, default: null },

    birthCertificatePath: { type: String, default: null },

    paymentProofPath: { type: String, default: null },

    paymentMethod: {
      type: String,
      enum: ['servant', 'instapay'],
      default: 'servant'
    },

    paymentConfirmed: {
      type: Boolean,
      default: false
    },

    karazaQualified: {
      type: Boolean,
      default: false
    },

    activities: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Activity' }]
  },
  { timestamps: true }
);

studentSchema.statics.buildFingerprint = buildStudentFingerprint;

studentSchema.pre('validate', function (next) {
  if (this.className) {
    this.className = normalizeClassNameValue(this.className);
  }

  if (this.studentYear) {
    this.studentYear = normalizeStudentYearValue(this.studentYear);
  }

  if (this.parentPhone !== undefined) {
    this.parentPhone = normalizePhoneValue(this.parentPhone);
  }

  if (this.studentPhone !== undefined) {
    this.studentPhone = normalizePhoneValue(this.studentPhone);
  }

  if (this.fullName && this.birthDate && this.className && this.studentYear) {
    this.studentFingerprint = buildStudentFingerprint({
      fullName: this.fullName,
      birthDate: this.birthDate,
      className: this.className,
      studentYear: this.studentYear
    });
  }

  next();
});

module.exports = mongoose.model('Student', studentSchema);
