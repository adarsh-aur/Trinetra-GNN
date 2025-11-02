import jwt from 'jsonwebtoken';
import User from '../models/user.js';

// Protect routes
export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Not authorized - user not found'
        });
      }

      if (!req.user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Not authorized - account deactivated'
        });
      }

      next();

    } catch (error) {
      console.error('Auth Middleware Error:', error.message);

      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Not authorized - invalid token'
        });
      }

      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Not authorized - token expired'
        });
      }

      return res.status(401).json({
        success: false,
        message: 'Not authorized - token verification failed'
      });
    }
  } else {
    return res.status(401).json({
      success: false,
      message: 'Not authorized - no token provided'
    });
  }
};

// Admin only
export const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Access denied - admin required'
    });
  }
};