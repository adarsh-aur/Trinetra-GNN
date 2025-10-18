import express from 'express';
import {
  register,
  login,
  getMe,
  updateCloudProvider,
  logout,
  deleteAccount,
  forgotPassword,    // Add this
  resetPassword      // Add this
} from '../controllers/authController.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);        // Add this
router.post('/reset-password/:token', resetPassword);  // Add this

// Protected routes
router.get('/me', protect, getMe);
router.put('/cloud-provider', protect, updateCloudProvider);
router.post('/logout', protect, logout);
router.delete('/account', protect, deleteAccount);

export default router;