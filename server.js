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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
app.use(cors());
app.use(cookieParser());

// --- FIX: DECLARE GLOBAL MIDDLEWARE FIRST ---
// These will parse JSON and URL-encoded bodies for *all* routes
// that don't have a more specific parser (like multer).
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- NOW REGISTER YOUR ROUTES ---
// The /api/users route will use its own multer middleware for /register
// and these global parsers will be skipped for that specific request.
app.use('/api/users', userRoutes);

// These routes will use the global express.json() parser
app.use('/api/auth', authRoutes);
app.use('/api/certificates', gscRoutes);
app.use('/api/certificates', nocRoutes);
app.use('/api/payment', paymentRoutes);

app.get('/', (req, res) =>
  res.send('🎉 Telangana Dental Council API is Running..........!!!!')
);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
};

startServer();