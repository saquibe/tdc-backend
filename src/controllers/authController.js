import jwt from "jsonwebtoken";
import BasicUser from "../models/BasicUser.js";
import sendEmail from "../utils/sendEmail.js";
import crypto from "crypto";

// ---------------- JWT Generator ----------------
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

// ---------------- Signup ----------------
export const signupBasic = async (req, res) => {
  try {
    const { full_name, email, mobile_number, password, confirm_password } =
      req.body;

    if (
      !full_name ||
      !email ||
      !mobile_number ||
      !password ||
      !confirm_password
    ) {
      return res.status(400).json({ error: "All fields are required." });
    }

    if (password !== confirm_password) {
      return res.status(400).json({ error: "Passwords do not match." });
    }

    const existingEmail = await BasicUser.findOne({ email });
    if (existingEmail) {
      return res.status(409).json({ error: "Email already exists" });
    }

    const existingMobile = await BasicUser.findOne({ mobile_number });
    if (existingMobile) {
      return res.status(409).json({ error: "Mobile number already exists" });
    }

    // Create user
    const user = new BasicUser({
      full_name,
      email,
      mobile_number,
      password,
    });

    await user.save();

    // 🔔 SEND REGISTRATION EMAIL
    await sendEmail({
      email: user.email,
      subject: "Telangana Dental Council – Registration Successful",
      message: `
        <p>Dear ${user.full_name},</p>

        <p>Your account has been successfully created on the
        <strong>Telangana Dental Council Portal</strong>.</p>

        <p><strong>Registered Email:</strong> ${user.email}<br/>
        <strong>Registered Mobile:</strong> ${user.mobile_number}</p>

        <p>You may now log in to the portal and complete your registration
        application.</p>

        <p>
          <a href="${process.env.FRONTEND_URL}/login"
             style="display:inline-block;padding:10px 16px;
             background:#00694A;color:#ffffff;text-decoration:none;
             border-radius:4px;">
            Login to Portal
          </a>
        </p>

        <p>Regards,<br/>
        Telangana Dental Council</p>

        <hr/>
        <small>This is an automated email. Please do not reply.</small>
      `,
    });

    const token = generateToken(user._id);

    return res.status(201).json({
      success: true,
      message: "Basic user registered successfully.",
      token,
      user: {
        id: user._id,
        full_name: user.full_name,
        email: user.email,
        mobile_number: user.mobile_number,
      },
    });
  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ---------------- Login ----------------
export const loginBasic = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Email and password are required." });
    }

    const user = await BasicUser.findOne({ email });

    if (!user) {
      return res.status(400).json({ error: "Invalid email or password." });
    }

    // TEMPORARY: Direct comparison (no bcrypt yet)
    if (password !== user.password) {
      return res.status(400).json({ error: "Invalid email or password." });
    }

    const token = generateToken(user._id);

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      user: {
        id: user._id,
        full_name: user.full_name,
        email: user.email,
        mobile_number: user.mobile_number,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ---------------- Forgot Password ----------------
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const user = await BasicUser.findOne({ email });

    // SECURITY: Always respond same
    if (!user) {
      return res.status(200).json({
        message: "If the email is registered, a reset link has been sent.",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");

    user.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000;

    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    await sendEmail({
      email: user.email,
      subject: "TDC Password Reset Request",
      message: `
        <p>Dear ${user.full_name},</p>
        <p>Click below to reset your password. Link valid for 15 minutes.</p>
        <a href="${resetUrl}"
           style="padding:10px 16px;background:#00694A;
           color:#fff;text-decoration:none;border-radius:4px;">
          Reset Password
        </a>
        <p>If not requested, ignore this email.</p>
      `,
    });

    return res.status(200).json({
      message: "If the email is registered, a reset link has been sent.",
    });
  } catch (error) {
    console.error("Forgot Password Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ---------------- Reset Password ----------------
// Update the resetPassword function in authController.js
export const resetPassword = async (req, res) => {
  try {
    const resetToken = req.params.token;
    const { email, password, confirm_password } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    if (!password || !confirm_password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    if (password !== confirm_password) {
      return res.status(400).json({ error: "Passwords do not match" });
    }

    // Password strength validation
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        error:
          "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
      });
    }

    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    const user = await BasicUser.findOne({
      email, // Added email verification
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired token" });
    }

    // TODO: Add bcrypt hashing here
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    // Send confirmation email
    await sendEmail({
      email: user.email,
      subject: "TDC Password Reset Successful",
      message: `
        <p>Dear ${user.full_name},</p>
        <p>Your password has been successfully reset.</p>
        <p>If you did not perform this action, please contact support immediately.</p>
        <hr/>
        <small>Telangana Dental Council Security Team</small>
      `,
    });

    res.status(200).json({
      success: true,
      message:
        "Password reset successful. Please login with your new password.",
    });
  } catch (error) {
    console.error("Reset Password Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ---------------- Get Profile ----------------
export const getBasicProfile = async (req, res) => {
  try {
    const user = await BasicUser.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Profile Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
