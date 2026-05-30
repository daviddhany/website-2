const path = require('path');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const Student = require('../models/Student');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const allowedTypes = {
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.png': ['image/png'],
  '.webp': ['image/webp'],
};

const defaultAllowed = Object.keys(allowedTypes);

function makeUpload(folder, allowedExtensions = defaultAllowed) {
  const normalizedExtensions = allowedExtensions.map(ext => ext.toLowerCase());

  const storage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const student = await Student.findById(req.session.userId);

      if (!student) {
        throw new Error('Student not found');
      }

      let type = 'file';
      if (folder.includes('student-photos')) type = 'student-photo';
      if (folder.includes('birth-certificates')) type = 'birth-certificate';
      if (folder.includes('payment-proofs')) type = 'payment-proof';

return {
  folder: 'students',
  resource_type: ext === '.pdf' ? 'raw' : 'image',
  public_id: `${student.studentCode}-${type}`,
  format: ext.replace('.', ''),
  overwrite: true,
};
    }
  });

  return multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const validMimeTypes = allowedTypes[ext] || [];

      if (!normalizedExtensions.includes(ext) || !validMimeTypes.includes(file.mimetype)) {
        return cb(new Error('نوع الملف غير مسموح. ارفع JPG أو PNG أو WEBP أو PDF فقط.'));
      }

      cb(null, true);
    }
  });
}

module.exports = { makeUpload };
