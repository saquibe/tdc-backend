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
    } = req.cleanedFormData;

    if (
      !nationality_id ||
      !regcategory_id ||
      !f_name ||
      !l_name ||
      !father_name ||
      !mother_name ||
      !place ||
      !dob ||
      !category ||
      !address ||
      !pan_number ||
      !aadhaar_number ||
      !email ||
      !mobile_number ||
      !regtype ||
      !gender
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const existing = await User.findOne({
      basic_user_id: basicUser._id,
      status: { $in: ["Pending", "Under Review"] },
    });

    if (existing) {
      return res.status(409).json({ error: "Application already pending" });
    }

    /* ===== FILE UPLOAD TO S3 ===== */
    const uploadedFileUrls = {};
    if (req.fileBufferMap) {
      for (const [field, file] of Object.entries(req.fileBufferMap)) {
        if (path.extname(file.originalname).toLowerCase() !== ".pdf") {
          return res.status(400).json({ error: `${field} must be PDF` });
        }
        if (req.fileBufferMap) {
          for (const [field, file] of Object.entries(req.fileBufferMap)) {
            if (path.extname(file.originalname).toLowerCase() !== ".pdf") {
              return res.status(400).json({ error: `${field} must be PDF` });
            }

            // Upload file to S3 using v3 helper
            uploadedFileUrls[field] = await uploadBufferToS3(
              file.buffer,
              file.originalname,
              `registrations/${f_name}_${l_name}` // folder path
            );
          }
        }
      }
    }

    const temporary_id = generateTemporaryId("APP");

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
      ...uploadedFileUrls,
    });

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

    res.status(201).json({
      success: true,
      message: "Registration submitted",
      data: {
        application_id: application._id,
        temporary_id,
        status: "Pending",
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
    "host"
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
  res.json(await RegistrationCategory.find({}));
};

export const getNationalities = async (_req, res) => {
  res.json(await Nationality.find({}));
};
