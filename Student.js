const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    description: { type: String, default: '' },
    category: { type: String, required: true, trim: true },
    price: {
      type: Number,
      default: 10,
      min: 0
    },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Activity', activitySchema);
