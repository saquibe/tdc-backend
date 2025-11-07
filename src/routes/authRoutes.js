import express from 'express';
import { signupBasic, loginBasic, getBasicProfile } from '../controllers/authController.js';
import { protect } from '../middlewares/userAuth.js';

const router = express.Router();

// Public routes
router.post('/signup', signupBasic);
router.post('/login', loginBasic);

// Protected route
router.get('/me', protect, getBasicProfile);

export default router;
