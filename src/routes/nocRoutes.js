import express from 'express';
import {
  applyNOC,
  updateNOC,
  getAllNOC,
  getNOCById,
} from '../controllers/nocController.js';
import staticFileUpload from '../middlewares/staticFileUpload.js';
import { protect } from '../middlewares/userAuth.js'; // <-- your JWT middleware

const router = express.Router();

const nocFileFields = ['tdc_reg_certificate_upload', 'aadhaar_upload'];
const nocTextFields = ['postal_address', 'dental_council_name'];

// POST - Apply NOC
router.post(
  '/apply-noc',
  protect,
  staticFileUpload(nocFileFields, nocTextFields, { required: true }),
  applyNOC
);

// POST - Update existing NOC (instead of PUT)
router.post(
  "/update-noc/:applicationNo",
  protect,
  staticFileUpload(nocFileFields, nocTextFields, { required: false }),
  updateNOC
);

// GET - All NOC applications
router.get('/noc', protect, getAllNOC);

// GET - Specific NOC by ID
router.get('/noc/:applicationNo', protect, getNOCById);

export default router;
