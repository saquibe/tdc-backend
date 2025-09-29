// middlewares/staticFileUpload.js
import multer from "multer";
import path from "path";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB limit
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext === ".pdf") cb(null, true);
  else cb(new Error("Only PDF files are allowed"), false);
};

/**
 * Middleware factory for GSC/NOC uploads
 * @param {string[]} expectedFiles - file field names
 * @param {string[]} expectedFields - text field names (like postal_address)
 * @param {object} options - { required: boolean } → whether to enforce all files
 */
const staticFileUpload = (
  expectedFiles = [],
  expectedFields = [],
  options = { required: true }
) => {
  const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: MAX_FILE_SIZE },
  });

  const multerFields = expectedFiles.map((name) => ({ name }));

  return (req, res, next) => {
    upload.fields(multerFields)(req, res, (err) => {
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ error: "Each file must be under 5MB" });
      }
      if (err) {
        return res
          .status(400)
          .json({ error: "File upload error", details: err.message });
      }

      // ✅ Extract uploaded files
      req.fileBufferMap = {};
      Object.keys(req.files || {}).forEach((field) => {
        req.fileBufferMap[field] = req.files[field][0];
      });

      // ✅ Only enforce required files if options.required = true
      if (options.required) {
        const uploadedFields = Object.keys(req.files || {});
        const missingFiles = expectedFiles.filter(
          (field) => !uploadedFields.includes(field)
        );

        if (missingFiles.length > 0) {
          return res.status(400).json({
            error: "Missing required files",
            missing: missingFiles,
          });
        }
      }

      // ✅ Extract text fields
      req.cleanedFormData = {};
      expectedFields.forEach((field) => {
        if (req.body[field]) {
          req.cleanedFormData[field] = req.body[field].trim();
        }
      });

      next();
    });
  };
};

export default staticFileUpload;


// // middlewares/staticFileUpload.js
// import multer from 'multer';
// import path from 'path';

// const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB limit

// const storage = multer.memoryStorage();

// const fileFilter = (req, file, cb) => {
//   const ext = path.extname(file.originalname).toLowerCase();
//   if (ext === '.pdf') cb(null, true);
//   else cb(new Error('Only PDF files are allowed'), false);
// };

// /**
//  * Middleware factory for GSC/NOC uploads
//  * @param {string[]} expectedFiles - required file field names
//  * @param {string[]} expectedFields - required text field names (like postal_address)
//  */
// const staticFileUpload = (expectedFiles = [], expectedFields = []) => {
//   const upload = multer({
//     storage,
//     fileFilter,
//     limits: { fileSize: MAX_FILE_SIZE }
//   });

//   const multerFields = expectedFiles.map(name => ({ name }));

//   return (req, res, next) => {
//     upload.fields(multerFields)(req, res, (err) => {
//       if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
//         return res.status(400).json({ error: 'Each file must be under 5MB' });
//       }
//       if (err) {
//         return res.status(400).json({ error: 'File upload error', details: err.message });
//       }

//       // ✅ Validate uploaded files
//       const uploadedFields = Object.keys(req.files || {});
//       const missingFiles = expectedFiles.filter(field => !uploadedFields.includes(field));

//       if (missingFiles.length > 0) {
//         return res.status(400).json({
//           error: 'Missing required files',
//           missing: missingFiles
//         });
//       }

//       // ✅ Extract files
//       req.fileBufferMap = {};
//       expectedFiles.forEach(field => {
//         req.fileBufferMap[field] = req.files[field][0];
//       });

//       // ✅ Extract form fields
//       req.cleanedFormData = {};
//       expectedFields.forEach(field => {
//         if (req.body[field]) {
//           req.cleanedFormData[field] = req.body[field].trim();
//         }
//       });

//       next();
//     });
//   };
// };

// export default staticFileUpload;

