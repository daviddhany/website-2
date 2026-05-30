const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema(
  {
    registrationOpen: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);
