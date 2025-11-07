import jwt from 'jsonwebtoken';
import BasicUser from '../models/BasicUser.js';

// Middleware to protect routes using JWT
export const protect = async (req, res, next) => {
  try {
    let token;

    // Try from Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } 
    // Or from cookies
    else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ success: false, error: 'Not authorized, token missing.' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user in BasicUser
    const user = await BasicUser.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (err) {
    console.error('Auth error:', err.message);
    res.status(401).json({ success: false, error: 'Token is invalid or expired.' });
  }
};
