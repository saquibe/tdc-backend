import path from "path";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { uploadBufferToS3 } from "../utils/uploadToS3.js"; // your v3 S3 helper

import RegistrationCategory from "../models/RegistrationCategory.js";
import Nationality from "../models/Nationality.js";
import User from "../models/User.js";
import BasicUser from "../models/BasicUser.js";
import sendEmail from "../utils/sendEmail.js";
import { generateTemporaryId } from "../utils/generateTempID.js";
import Payment from "../models/Payment.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ================= JWT ================= */
const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "7d",
  });

/* ================= REGISTER USER ================= */
export const registerUser = async (req, res) => {
  try {
     console.log("📋 All cleaned form data fields:", Object.keys(req.cleanedFormData || {}));
    console.log("📋 registrationCategory value:", req.cleanedFormData?.registrationCategory);
    const basicUser = req.user;
    if (!basicUser) {
      return res.status(401).json({ error: "Authentication failed" });
    }

    const {
      nationality_id,
      regcategory_id,
      email,
      mobile_number,
      f_name,
      l_name,
      m_name,
      father_name,
      mother_name,
      place,
      dob,
      category,
      address,
      pan_number,
      aadhaar_number,
      regtype,
      gender,
      payment_id,
      order_id,
      payment_status,
      registrationCategory,
      telephone_number,
    } = req.cleanedFormData;

       console.log("✅ Extracted registrationCategory:", registrationCategory);

    // Check if payment is completed
    if (payment_status !== "completed" || !payment_id || !order_id) {
      return res.status(400).json({ 
        error: "Payment is required to complete registration" 
      });
    }

    // Verify payment exists and is successful
    const payment = await Payment.findOne({
      payment_id,
      order_id,
      basic_user_id: basicUser._id,
      status: "paid",
    });

    if (!payment) {
      return res.status(400).json({ 
        error: "Valid payment not found. Please complete payment first." 
      });
    }

      console.log("✅ Payment verified:", payment._id);

    // Check for existing application
    const existing = await User.findOne({
      basic_user_id: basicUser._id,
      status: { $in: ["Pending", "Under Review"] },
    });

    if (existing) {
      return res.status(409).json({ error: "Application already pending" });
    }

    // Upload files to S3
    const uploadedFileUrls = {};
    if (req.fileBufferMap) {
      for (const [field, file] of Object.entries(req.fileBufferMap)) {
        if (path.extname(file.originalname).toLowerCase() !== ".pdf") {
          return res.status(400).json({ error: `${field} must be PDF` });
        }

        uploadedFileUrls[field] = await uploadBufferToS3(
          file.buffer,
          file.originalname,
          `registrations/${f_name}_${l_name}`,
        );
      }
    }

    const temporary_id = generateTemporaryId("APP");

    // Create application
    const application = await User.create({
      basic_user_id: basicUser._id,
      temporary_id,
      membership_id: basicUser.membership_id || null,
      nationality_id,
      regcategory_id,
      f_name,
      m_name,
      l_name,
      father_name,
      mother_name,
      place,
      dob,
      category,
      gender,
      email,
      mobile_number,
      address,
      pan_number,
      aadhaar_number,
      regtype,
      payment_id,
      order_id,
      registrationCategory,
      telephone_number,
      payment_status: "completed",
      payment_amount: payment.amount,
      ...uploadedFileUrls,
    });

    // Update payment with application reference
    await Payment.findByIdAndUpdate(payment._id, {
      $set: { user_id: application._id }
    });

    // Update basic user profile
    basicUser.name_in_full = `${f_name} ${m_name || ""} ${l_name}`.trim();
    basicUser.gender = gender;
    basicUser.place = place;
    basicUser.dob = dob;
    basicUser.nationality_id = nationality_id;
    basicUser.address = address;
    basicUser.pan_number = pan_number;
    basicUser.aadhaar_number = aadhaar_number;
    basicUser.last_application = application._id;
    basicUser.last_application_status = "Pending";
    basicUser.applications.push(application._id);

    await basicUser.save();

    // Send confirmation email
    await sendEmail({
      email: email,
      subject: "Registration Application Submitted",
      message: `
        <h2>Registration Application Submitted Successfully</h2>
        <p>Dear ${f_name} ${l_name},</p>
        <p>Your application for ${registrationCategory} has been submitted successfully.</p>
        <p><strong>Application ID:</strong> ${temporary_id}</p>
        <p><strong>Payment Reference:</strong> ${payment_id}</p>
        <p><strong>Status:</strong> Pending Review</p>
        <p>You will be notified once your application is reviewed.</p>
      `,
    });

    res.status(201).json({
      success: true,
      message: "Registration submitted successfully",
      data: {
        application_id: application._id,
        temporary_id,
        payment_id,
        status: "Pending",
        amount_paid: payment.amount,
      },
    });
  } catch (err) {
    console.error("Register Error:", err);
    res.status(500).json({ error: err.message });
  }
};

/* ================= LOGIN ================= */
export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  const user =
    (await User.findOne({ email })) || (await BasicUser.findOne({ email }));

  if (!user || password !== user.password) {
    return res.status(400).json({ message: "Invalid credentials" });
  }

  const token = generateToken(user._id);

  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({ success: true, message: "Login successful" });
};

/* ================= LOGOUT ================= */
export const logoutUser = (req, res) => {
  res.clearCookie("token");
  res.json({ success: true });
};

/* ================= GET PROFILE ================= */
export const getUserProfile = async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate("regcategory_id", "name")
    .populate("nationality_id", "name")
    .lean();

  if (!user) return res.status(404).json({ error: "User not found" });

  res.json({ success: true, data: user });
};

/* ================= PASSWORD RESET ================= */
export const forgotPassword = async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) return res.status(404).json({ error: "User not found" });

  const token = crypto.randomBytes(20).toString("hex");
  user.resetPasswordToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
  user.resetPasswordExpire = Date.now() + 15 * 60 * 1000;

  await user.save({ validateBeforeSave: false });

  const resetUrl = `${req.protocol}://${req.get(
    "host",
  )}/api/users/reset-password/${token}`;

  await sendEmail({
    email: user.email,
    subject: "Password Reset",
    message: `<a href="${resetUrl}">Reset Password</a>`,
  });

  res.json({ success: true, message: "Reset email sent" });
};

export const resetPassword = async (req, res) => {
  const hashed = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    resetPasswordToken: hashed,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) return res.status(400).json({ error: "Invalid token" });

  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  res.json({ success: true, message: "Password updated" });
};

/* ================= MASTER DATA ================= */
export const getRegistrationCategories = async (_req, res) => {
  try {
    const categories = await RegistrationCategory.find({});
    const formatted = categories.map((cat) => ({
      _id: cat._id.toString(),
      name: cat.name,
    }));
    res.json(formatted);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
};

export const getNationalities = async (_req, res) => {
  try {
    const nationalities = await Nationality.find({});
    const formatted = nationalities.map((nat) => ({
      _id: nat._id.toString(),
      name: nat.name,
    }));
    res.json(formatted);
  } catch (error) {
    console.error("Error fetching nationalities:", error);
    res.status(500).json({ error: "Failed to fetch nationalities" });
  }
};
