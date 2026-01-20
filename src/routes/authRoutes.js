import express from "express";
import {
  signupBasic,
  loginBasic,
  getBasicProfile,
  forgotPassword,
  resetPassword,
} from "../controllers/authController.js";
import { protect } from "../middlewares/userAuth.js";

const router = express.Router();

// Public routes
router.post("/signup", signupBasic);
router.post("/login", loginBasic);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

// Protected route
router.get("/me", protect, getBasicProfile);

export default router;
