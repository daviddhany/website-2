const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema(
  {
    registrationOpen: {
      type: Boolean,
      default: true
    },
    registrationClosesAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);
