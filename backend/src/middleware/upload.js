const multer = require('multer');
const path = require('path');

// Only accept .csv
const fileFilter = (req, file, cb) => {
  if (file.originalname.toLowerCase().endsWith('.csv')) {
    cb(null, true);
  } else {
    cb(new Error('Only .csv files are allowed'), false);
  }
};

// ✅ Memory storage — file lives in req.file.buffer, never touches disk
module.exports = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
});