const express = require('express');
const Activity = require('../models/Activity');
const Category = require('../models/Category');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res) => {
  const activities = await Activity.find({}).sort('name');
  res.json(activities);
});

router.post('/', requireAdmin, async (req, res) => {
  const name = (req.body.name || '').trim();
  const description = (req.body.description || '').trim();
  const category = (req.body.category || '').trim();
  const price = Number.isFinite(Number(req.body.price)) ? Number(req.body.price) : 10;

  if (!name) {
    return res.status(400).json({ error: 'اسم النشاط مطلوب' });
  }

  if (!category) {
    return res.status(400).json({ error: 'تصنيف النشاط مطلوب' });
  }

  try {
    const selectedCategory = await Category.findOne({ name: category, isActive: true });

    if (!selectedCategory) {
      return res.status(400).json({ error: 'تصنيف النشاط غير موجود' });
    }

    const existingActivity = await Activity.findOne({ name });

    if (existingActivity) {
      return res.status(409).json({ error: 'هذا النشاط موجود بالفعل' });
    }

    const activity = await Activity.create({
      name,
      description,
      category,
      price,
      isActive: true
    });

    return res.json(activity);
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ error: 'هذا النشاط موجود بالفعل' });
    }

    console.error('Create activity error:', err);
    return res.status(500).json({ error: 'فشل إضافة النشاط. حاول مرة أخرى' });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  await Activity.findByIdAndDelete(req.params.id);
  res.json({ message: 'Activity deleted' });
});

module.exports = router;