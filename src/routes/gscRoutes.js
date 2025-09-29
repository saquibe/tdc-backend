import express from 'express';
import { applyGSC, updateGSC, getGSC } from '../controllers/gscController.js';
import staticFileUpload from '../middlewares/staticFileUpload.js';
import { protectRegisteredUser } from '../middlewares/protectRegisteredUser.js'; // Use the new middleware

const router = express.Router();

const gscFields = [
  'tdc_reg_certificate_upload',
  'testimonial_d1_upload',
  'testimonial_d2_upload',
  'aadhaar_upload',
  'tdc_reg_d1_upload',
  'tdc_reg_d2_upload'
];
const gscTextFields = ['postal_address'];

// --- ROUTE FOR NEW APPLICATIONS (all files required) ---
router.post(
  '/apply-gsc',
  protectRegisteredUser,
  staticFileUpload(gscFields, gscTextFields, { required: true }),
  applyGSC
);

// --- ROUTE FOR UPDATING EXISTING APPLICATIONS (files optional) ---
router.put(
  '/apply-gsc/:applicationNo',
  protectRegisteredUser,
  staticFileUpload(gscFields, gscTextFields, { required: false }),
  updateGSC
);

// --- ROUTE TO GET ALL APPLICATIONS ---
router.get('/gsc', protectRegisteredUser, getGSC);

export default router;
