import express from 'express';
import { registerUser, getProfile, getRegistrationCategories, getNationalities, logoutUser } from '../controllers/userController.js';
import dynamicUpload from '../middlewares/dynamicUpload.js';
import { protect } from '../middlewares/userAuth.js';

const router = express.Router();

router.post('/register', protect, dynamicUpload, registerUser);
router.get('/profile', protect, getProfile);
router.get('/logout', logoutUser);
router.get('/categories', getRegistrationCategories);
router.get('/nationalities', getNationalities);

export default router;
