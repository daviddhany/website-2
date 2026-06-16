const express = require('express');
const Category = require('../models/Category');
const Activity = require('../models/Activity');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Creates the category/menu documents automatically from old activities
// so the dropdown is not empty after updating an old database.
async function syncCategoriesFromActivities() {
  const activityCategories = await Activity.distinct('category', {
    category: { $exists: true, $ne: '' }
  });

  for (const name of activityCategories) {
    await Category.updateOne(
      { name },
      { $setOnInsert: { name }, $set: { isActive: true } },
      { upsert: true }
    );
  }
}

router.get('/', async (req, res) => {
  await syncCategoriesFromActivities();
  const categories = await Category.find({ isActive: true }).sort('name');
  res.json(categories);
});

router.post('/', requireAdmin, async (req, res) => {
  const name = (req.body.name || '').trim();

  if (!name) {
    return res.status(400).json({ error: 'اسم الـ menu / التصنيف مطلوب' });
  }

  try {
    const existingCategory = await Category.findOne({ name });

    if (existingCategory) {
      if (!existingCategory.isActive) {
        existingCategory.isActive = true;
        await existingCategory.save();
        return res.json(existingCategory);
      }

      return res.status(409).json({ error: 'هذا الـ menu / التصنيف موجود بالفعل' });
    }

    const category = await Category.create({ name, isActive: true });
    return res.json(category);
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ error: 'هذا الـ menu / التصنيف موجود بالفعل' });
    }

    console.error('Create category error:', err);
    return res.status(500).json({ error: 'فشل إضافة الـ menu / التصنيف. حاول مرة أخرى' });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    return res.status(404).json({ error: 'الـ menu / التصنيف غير موجود' });
  }

  category.isActive = false;
  await category.save();

  res.json({ message: 'Menu / Category removed' });
});

module.exports = router;
