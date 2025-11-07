import express from 'express';
import { applyNOC, updateNOC, getNOC } from '../controllers/nocController.js';
import staticFileUpload from '../middlewares/staticFileUpload.js';
import { protectRegisteredUser } from '../middlewares/protectRegisteredUser.js'; // Assuming this is defined elsewhere

const router = express.Router();

const nocFields = [
  'tdc_reg_certificate_upload',
  'aadhaar_upload'
];
const nocTextFields = ['postal_address', 'dental_council_name'];

// --- ROUTE FOR NEW APPLICATIONS (all files required) ---
router.post(
  '/apply-noc',
  protectRegisteredUser,
  staticFileUpload(nocFields, nocTextFields, { required: true }),
  applyNOC
);

// --- NEW ROUTE FOR UPDATING EXISTING APPLICATIONS (files optional) ---
router.put(
  '/apply-noc/:applicationNo',
  protectRegisteredUser,
  staticFileUpload(nocFields, nocTextFields, { required: false }),
  updateNOC
);

// --- ROUTE TO GET ALL APPLICATIONS ---
router.get('/noc', protectRegisteredUser, getNOC);

export default router;
