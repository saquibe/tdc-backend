import jwt from 'jsonwebtoken';
import BasicUser from '../models/BasicUser.js';

// ---------------- JWT Generator ----------------
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// ---------------- Signup ----------------
export const signupBasic = async (req, res) => {
  try {
    const { full_name, email, mobile_number, password, confirm_password } = req.body;

    if (!full_name || !email || !mobile_number || !password || !confirm_password) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    if (password !== confirm_password) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    // Check for duplicates
    const existingEmail = await BasicUser.findOne({ email });
    if (existingEmail) return res.status(409).json({ error: 'Email already exists' });

    const existingMobile = await BasicUser.findOne({ mobile_number });
    if (existingMobile) return res.status(409).json({ error: 'Mobile number already exists' });

    // Create Basic User (no hashing for now)
    const user = new BasicUser({ full_name, email, mobile_number, password });
    await user.save();

    const token = generateToken(user._id);

    return res.status(201).json({
      success: true,
      message: 'Basic user registered successfully.',
      token,
      user: {
        id: user._id,
        full_name: user.full_name,
        email: user.email,
        mobile_number: user.mobile_number,
      },
    });
  } catch (error) {
    console.error('Signup Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ---------------- Login ----------------
export const loginBasic = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await BasicUser.findOne({ email });

    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    // TEMPORARY: Direct comparison (no bcrypt yet)
    if (password !== user.password) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    const token = generateToken(user._id);

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: user._id,
        full_name: user.full_name,
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
    const user = await BasicUser.findById(req.user.id).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('Profile Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
