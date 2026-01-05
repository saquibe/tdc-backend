// server.js

import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';

import connectDB from './src/config/db.js';
import authRoutes from './src/routes/authRoutes.js';
import userRoutes from './src/routes/userRoutes.js';
import gscRoutes from './src/routes/gscRoutes.js';
import nocRoutes from './src/routes/nocRoutes.js';
import paymentRoutes from './src/routes/paymentRoutes.js';

// ==================== PATH FIXES ====================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==================== CONFIG ========================
dotenv.config();

// ==================== EXPRESS APP ===================
const app = express();

// ==================== MIDDLEWARE ====================
app.use(cors());
app.use(cookieParser());

// Global body parsers (JSON & URL-encoded)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==================== ROUTES ========================
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/certificates/gsc', gscRoutes);
app.use('/api/certificates/noc', nocRoutes);
app.use('/api/payment', paymentRoutes);

// console.log("Key:", process.env.RAZORPAY_KEY_ID);
// console.log("Secret:", process.env.RAZORPAY_SECRET);
// console.log("Mongo URI:", process.env.MONGO_URI);


// Health check endpoint
app.get('/', (req, res) => {
  res.send('🎉 Telangana Dental Council API is running...');
});

// ==================== START SERVER ==================
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

startServer();
