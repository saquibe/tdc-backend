import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

import RegistrationCategory from '../models/RegistrationCategory.js';
import Nationality from '../models/Nationality.js';
import User from '../models/User.js';
import BasicUser from '../models/BasicUser.js'; // Import BasicUser model
import sendEmail from '../utils/sendEmail.js';
import { uploadBufferToCloudinary } from '../utils/uploadToCloudinary.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// ================= REGISTER AND TRANSFER USER PROFILE =================
export const registerUser = async (req, res) => {
  try {
    const basicUser = req.user;

    if (!basicUser) {
      return res.status(401).json({ error: "Authentication failed. User not found." });
    }
    
    // Destructure and validate all required fields
    const {
        nationality_id, regcategory_id, email, mobile_number, f_name, l_name,
        father_name, mother_name, place, dob, category, address, pan_number,
        aadhaar_number, regtype
    } = req.cleanedFormData;

    if (!f_name || !l_name || !father_name || !mother_name || !place || !dob || !category || !address ||
        !pan_number || !aadhaar_number || !regtype || !email || !mobile_number || !nationality_id || !regcategory_id) {
        return res.status(400).json({ error: "Missing required personal information fields." });
    }

    const existingFullUser = await User.findOne({ email: basicUser.email });
    if (existingFullUser) {
        return res.status(409).json({ error: "A full profile already exists for this user." });
    }

    const uploadedFileUrls = {};
    for (const [fieldName, file] of Object.entries(req.fileBufferMap)) {
        if (path.extname(file.originalname).toLowerCase() !== '.pdf') {
            return res.status(400).json({ error: `Only PDF files allowed. '${file.originalname}' is not a PDF.` });
        }
        const fullName = [f_name, l_name].filter(Boolean).join('_');
        const safeName = fullName.replace(/[^a-zA-Z0-9_]/g, '').replace(/[ ]+/g, '_');
        const cloudinaryUrl = await uploadBufferToCloudinary(file.buffer, safeName, fieldName);
        uploadedFileUrls[fieldName] = cloudinaryUrl;
    }

    // Create a NEW User document by combining BasicUser and form data
    const newUser = new User({
        ...basicUser.toObject(),
        ...req.cleanedFormData,
        ...uploadedFileUrls,
        regtype: regtype.trim()
    });
    
    delete newUser._id;

    // Await the save operation to confirm it was successful
    const savedUser = await newUser.save();
    
    if (!savedUser) {
      throw new Error("User document could not be saved to the database.");
    }

    // Delete the old BasicUser document to prevent duplicates
    // await BasicUser.findByIdAndDelete(basicUser._id);

    const token = generateToken(newUser._id);
    res.status(201).json({
      success: true,
      message: "User registered and profile created successfully.",
      token,
      data: {
        id: newUser._id,
        f_name: newUser.f_name,
        l_name: newUser.l_name,
        email: newUser.email,
      }
    });

  } catch (err) {
    console.error("Registration and Transfer Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ================= LOGIN USER =================
// ================= LOGIN USER (FIXED FOR NO BCRYPT) =================
export const loginUser = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }

    // Look for the user in the new User model
    const user = await User.findOne({ email });
    
    if (!user) {
        // If not in the User model, check the BasicUser model
        const basicUser = await BasicUser.findOne({ email });
        
        if (!basicUser) {
            return res.status(400).json({ message: 'Invalid email or password.' });
        }
        
        // --- TEMPORARY FIX: Direct String Comparison for BasicUser ---
        // NOTE: This is NOT secure and must be replaced with bcrypt.compare(password, basicUser.password)
        if (password !== basicUser.password) {
            return res.status(400).json({ message: 'Invalid email or password.' });
        }
        // --- END OF TEMPORARY FIX ---

        const token = generateToken(basicUser._id);
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });
        return res.status(200).json({
            success: true,
            message: 'Login successful',
            user: { id: basicUser._id, fullname: basicUser.full_name, email: basicUser.email }
        });
    }

    // --- TEMPORARY FIX: Direct String Comparison for Full User ---
    // NOTE: This is NOT secure and must be replaced with bcrypt.compare(password, user.password)
    if (password !== user.password) {
        return res.status(400).json({ message: 'Invalid email or password.' });
    }
    // --- END OF TEMPORARY FIX ---

    const token = generateToken(user._id);

    res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(200).json({
        success: true,
        message: 'Login successful',
        user: {
            id: user._id,
            fullname: `${user.f_name} ${user.m_name || ''} ${user.l_name}`.trim(),
            email: user.email
        }
    });
};

// ================= LOGOUT USER =================
export const logoutUser = (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict'
  });

  res.status(200).json({ success: true, message: 'Logged out successfully' });
};

// ================= GET PROFILE =================
// export const getProfile = async (req, res) => {
//   res.status(200).json({
//     success: true,
//     data: req.user
//   });
// };
// ================= GET PROFILE =================
export const getProfile = async (req, res) => {
  try {
    // req.user._id should be set by your 'protect' middleware
    const user = await User.findById(req.user._id)
      .populate('regcategory_id', 'name')
      .populate('nationality_id', 'name')
      .lean();

    if (!user) return res.status(404).json({ error: 'User not found' });

    // Flatten populated fields for frontend
    const responseProfile = {
      ...user,
      regcategory_name: user.regcategory_id?.name || '',
      nationality_name: user.nationality_id?.name || '',
      // To avoid exposing password/hash:
      password: undefined,
      resetPasswordToken: undefined,
      resetPasswordExpire: undefined,
      __v: undefined,
    };

    res.status(200).json({
      success: true,
      data: responseProfile,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};


// ================= FORGOT PASSWORD =================
export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: 'User not found.' });

  const resetToken = crypto.randomBytes(20).toString('hex');
  user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  user.resetPasswordExpire = Date.now() + 15 * 60 * 1000;

  await user.save({ validateBeforeSave: false });

  const resetUrl = `${req.protocol}://${req.get('host')}/api/users/reset-password/${resetToken}`;
  const message = `
    <h3>Hello ${user.f_name},</h3>
    <p>You requested to reset your password.</p>
    <p><a href="${resetUrl}">Click here to reset your password</a></p>
    <p>This link expires in 15 minutes.</p>
  `;

  try {
    await sendEmail({
      email: user.email,
      subject: 'TSDC Password Reset Request',
      message
    });

    res.status(200).json({
      success: true,
      message: 'Reset password email sent.',
      resetUrl
    });
  } catch (error) {
    console.error("Email sending error:", error);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });

    res.status(500).json({ success: false, message: 'Failed to send reset email.' });
  }
};

// ================= RESET PASSWORD =================
export const resetPassword = async (req, res) => {
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: Date.now() }
  });

  if (!user) {
    return res.status(400).json({ message: 'Invalid or expired token.' });
  }

  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  const token = generateToken(user._id);

  res.status(200).json({
    success: true,
    token,
    message: 'Password updated successfully.'
  });
};

// ================= GET REGISTRATION CATEGORIES =================
export const getRegistrationCategories = async (req, res) => {
  try {
    const categories = await RegistrationCategory.find({});
    res.status(200).json(categories);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch registration categories." });
  }
};

// ================= GET NATIONALITIES =================
export const getNationalities = async (req, res) => {
  try {
    const nationalities = await Nationality.find({});
    res.status(200).json(nationalities);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch nationalities." });
  }
};