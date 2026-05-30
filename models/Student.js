const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    studentCode: { type: String, required: true, unique: true, trim: true },

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
      enum: [
        'اولى إبتدائي',
        'تانية إبتدائي',
        'ثالثة إبتدائي',
        'رابعة إبتدائي',
        'خمسة إبتدائي',
        'سادسة إبتدائي',
        'اولى اعدادي',
        'تانية اعدادي',
        'ثالثة اعدادي',
        'اولى إعدادي',
        'تانية إعدادي',
        'ثالثة إعدادي'
      ]
    },

    // ✅ Birthdate
    birthDate: {
      type: Date,
      required: true
    },
canTravel: {
  type: Boolean,
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

module.exports = mongoose.model('Student', studentSchema);