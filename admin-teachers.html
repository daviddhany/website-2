const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true
    },

    phone: {
      type: String,
      required: true,
      unique: true,
      match: [/^\d{11}$/, 'Phone number must be exactly 11 digits']
    },

    passwordHash: {
      type: String,
      required: true
    },

    role: {
      type: String,
      enum: ['admin', 'teacher', 'serviceLeader'],
      default: 'teacher'
    },

    assignedClass: {
      type: String,
      enum: ['خمسة و ستة', 'إعدادي', 'اعدادي', 'يوحنا', 'ابوسيفين', 'العذراء'],
      required: function () {
        return this.role === 'teacher' || this.role === 'serviceLeader';
      }
    },

    assignedGender: {
      type: String,
      enum: ['male', 'female', 'all'],
      default: 'all'
    },

    assignedYear: {
      type: String,
      required: function () {
        return this.role === 'teacher';
      },
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
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Teacher', teacherSchema);