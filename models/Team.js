const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    activity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Activity',
      required: true
    },

    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      required: true
    },

    students: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student'
      }
    ],

    locked: {
      type: Boolean,
      default: false
    },

    lockedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Team', teamSchema);