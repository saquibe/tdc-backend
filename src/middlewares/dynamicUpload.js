import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

import RegistrationCategory from '../models/RegistrationCategory.js';
import CategoryFieldsMap from '../utils/categoryFieldsMap.js';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB limit

// In-memory file storage
const storage = multer.memoryStorage();

// Only allow PDF files
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext === '.pdf') cb(null, true);
  else cb(new Error('Only PDF files are allowed'), false);
};

const dynamicUpload = async (req, res, next) => {
  const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: MAX_FILE_SIZE }
  }).any();

  upload(req, res, async (err) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      console.error('❌ Multer: File too large');
      return res.status(400).json({ error: 'Each file must be under 5MB' });
    }
    if (err) {
      console.error('❌ Multer Error:', err);
      return res.status(400).json({ error: 'File upload error', details: err.message });
    }

    try {
      console.log('📥 Incoming request detected for dynamic upload');

      // Log request content type
      console.log('🔹 Content-Type:', req.headers['content-type']);

      // Log raw uploaded files (if any)
      console.log('🗂 Multer parsed files:', req.files ? req.files.length : 0);
      if (req.files && req.files.length > 0) {
        req.files.forEach((f, i) => {
          console.log(`   [${i + 1}] ${f.fieldname} → ${f.originalname} (${f.mimetype}, ${f.size} bytes)`);
        });
      } else {
        console.warn('⚠️ No files detected in request — check Content-Type and form-data settings.');
      }

      const { regcategory_id } = req.body;
      console.log('📦 regcategory_id:', regcategory_id);

      if (!regcategory_id) {
        console.warn('❌ regcategory_id missing in request body');
        return res.status(400).json({ error: 'regcategory_id is required in body' });
      }

      // Fetch category details
      const regCategory = await RegistrationCategory.findById(regcategory_id);
      if (!regCategory) {
        console.warn('❌ Invalid regcategory_id');
        return res.status(400).json({ error: 'Invalid regcategory_id' });
      }

      const categoryName = regCategory.name;
      req.regCategoryName = categoryName;

      console.log('🧾 Category Name:', categoryName);

      // Base required files for all users
      const baseFileFields = ['pan_upload', 'aadhaar_upload', 'sign_upload'];
      const categoryFiles = CategoryFieldsMap[categoryName]?.files || [];

      const requiredDynamicFields = categoryFiles
        .filter(f => !f.optional)
        .map(f => f.name);

      const requiredFields = [...baseFileFields, ...requiredDynamicFields];
      const uploadedFields = (req.files || []).map(file => file.fieldname);

      console.log('✅ Required Fields:', requiredFields);
      console.log('✅ Uploaded Fields:', uploadedFields);

      const missingFields = requiredFields.filter(field => !uploadedFields.includes(field));
      if (missingFields.length > 0) {
        console.warn('🚨 Missing required files:', missingFields);
        return res.status(400).json({
          error: 'Missing required files',
          missing: missingFields
        });
      }

      req.cleanedFormData = { ...req.body };
      req.fileBufferMap = {};

      req.files.forEach(file => {
        req.fileBufferMap[file.fieldname] = file;
      });

      console.log('🧩 FileBufferMap Keys:', Object.keys(req.fileBufferMap));

      console.log('✅ dynamicUpload middleware completed successfully.\n');
      next();

    } catch (err) {
      console.error('❌ Dynamic upload middleware error:', err);
      res.status(500).json({ error: 'File processing error', details: err.message });
    }
  });
};

export default dynamicUpload;
