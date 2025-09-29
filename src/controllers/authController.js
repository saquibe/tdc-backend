// import jwt from 'jsonwebtoken';
// import bcrypt from 'bcryptjs';
// import axios from 'axios';
// import BasicUser from '../models/BasicUser.js';

// // Generate JWT token
// const generateToken = (id) => {
//   return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
// };

// // Verify captcha with Google
// // const verifyCaptcha = async (captcha) => {
// //   if (!captcha) return false;

// //   try {
// //     const verifyURL = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET}&response=${captcha}`;
// //     const { data } = await axios.post(verifyURL);
// //     return data.success;
// //   } catch (err) {
// //     console.error("Captcha verification error:", err.message);
// //     return false;
// //   }
// // };

// // ---------------- Signup ----------------
// export const signupBasic = async (req, res) => {
//   try {
//     const { full_name, email, mobile_number, password, confirm_password} = req.body;

//     // 1. Check fields
//     if (!full_name || !email || !mobile_number || !password || !confirm_password ) {
//       return res.status(400).json({ error: 'All fields including captcha are required.' });
//     }

//     // 2. Verify captcha
// //     const isCaptchaValid = await verifyCaptcha(captcha);
// //     if (!isCaptchaValid) {
// //       return res.status(400).json({ error: 'Captcha verification failed.' });
// //     }

//     // 3. Password match
//     if (password !== confirm_password) {
//       return res.status(400).json({ error: 'Passwords do not match.' });
//     }

//     // 4. Check duplicates
//     const existingEmail = await BasicUser.findOne({ email });
//     if (existingEmail) return res.status(409).json({ error: 'Email already exists' });

//     const existingMobile = await BasicUser.findOne({ mobile_number });
//     if (existingMobile) return res.status(409).json({ error: 'Mobile number already exists' });

//     // 5. Create user
//     const user = new BasicUser({ full_name, email, mobile_number, password });
//     await user.save();

//     // 6. Generate token
//     const token = generateToken(user._id);

//     res.status(201).json({
//       success: true,
//       message: 'Basic user registered successfully.',
//       token,
//       user: {
//         id: user._id,
//         full_name: user.full_name,
//         email: user.email,
//       },
//     });
//   } catch (error) {
//     console.error('Signup Error:', error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// };

// // ---------------- Login ----------------
// export const loginBasic = async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     // 1. Validate fields
//     if (!email || !password ) {
//       return res.status(400).json({ error: 'Email, password, and captcha are required.' });
//     }

//     // 2. Verify captcha
// //     const isCaptchaValid = await verifyCaptcha(captcha);
// //     if (!isCaptchaValid) {
// //       return res.status(400).json({ error: 'Captcha verification failed.' });
// //     }

//     // 3. Find user
//     const user = await BasicUser.findOne({ email });
//     if (!user) return res.status(400).json({ error: 'Invalid email or password.' });

//     // 4. Compare password
// //     const isMatch = await bcrypt.compare(password, user.password);
//     if (password!==user.password) return res.status(400).json({ error: 'Invalid email or password.' });

//     // 5. Generate token
//     const token = generateToken(user._id);

//     res.status(200).json({
//       success: true,
//       message: 'Login successful',
//       token,
//       user: {
//         id: user._id,
//         full_name: user.full_name,
//         email: user.email,
//       },
//     });
//   } catch (error) {
//     console.error('Login Error:', error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// };

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import BasicUser from '../models/BasicUser.js';
import User from '../models/User.js'; 

// Generate JWT token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// ---------------- Signup ----------------
export const signupBasic = async (req, res) => {
    try {
        const { full_name, email, mobile_number, password, confirm_password} = req.body;

        if (!full_name || !email || !mobile_number || !password || !confirm_password ) {
            return res.status(400).json({ error: 'All fields are required.' });
        }

        if (password !== confirm_password) {
            return res.status(400).json({ error: 'Passwords do not match.' });
        }

        const existingEmail = await BasicUser.findOne({ email });
        if (existingEmail) return res.status(409).json({ error: 'Email already exists' });

        const existingMobile = await BasicUser.findOne({ mobile_number });
        if (existingMobile) return res.status(409).json({ error: 'Mobile number already exists' });

        const user = new BasicUser({ full_name, email, mobile_number, password });
        await user.save();

        const token = generateToken(user._id);

        res.status(201).json({
            success: true,
            message: 'Basic user registered successfully.',
            token,
            user: {
                id: user._id,
                full_name: user.full_name,
                email: user.email,
                mobile_number: user.mobile_number, // Added mobile number
            },
        });
    } catch (error) {
        console.error('Signup Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// ---------------- Login ----------------
// Ensure you have all necessary imports at the top of the file
// import jwt from 'jsonwebtoken';
// import BasicUser from '../models/BasicUser.js'; 
// import User from '../models/User.js'; 
// const generateToken = (id) => { /* ... */ };

export const loginBasic = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        // --- PHASE 1: Search the BasicUser Collection ---
        let user = await BasicUser.findOne({ email });

        if (!user) {
            // --- PHASE 2: Search the final User Collection (Fallback for Upgraded Users) ---
            user = await User.findOne({ email });
        }

        // --- PHASE 3: Handle Not Found ---
        if (!user) {
            return res.status(400).json({ error: 'Invalid email or password.' });
        }
        
        // --- PHASE 4: Password Check (TEMPORARY DIRECT COMPARISON) ---
        // ⚠️ REMEMBER TO REPLACE THIS WITH bcrypt.compare() LATER ⚠️
        if (password !== user.password) { 
            return res.status(400).json({ error: 'Invalid email or password.' });
        }
        
        // --- PHASE 5: Successful Login Response ---
        const token = generateToken(user._id);

        res.status(200).json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                // The name fields are conditional depending on the model found
                full_name: user.full_name || `${user.f_name} ${user.m_name || ''} ${user.l_name}`.trim(),
                email: user.email,
                mobile_number: user.mobile_number,
            },
        });
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
// ---------------- Get Profile ----------------
export const getBasicProfile = async (req, res) => {
  try {
    const user = await BasicUser.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Profile Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
