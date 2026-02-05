// routes/paymentRoutes.js
import express from "express";
import {
  createOrder,
  verifyPayment,
  getPaymentStatus,
  calculateFee,
} from "../controllers/paymentController.js";
import { protect } from "../middlewares/userAuth.js";

const router = express.Router();

// Protected routes
router.post("/create-order", protect, createOrder);
router.post("/verify", protect, verifyPayment);
router.get("/status/:order_id", protect, getPaymentStatus);
router.post("/calculate-fee", protect, calculateFee);

export default router;