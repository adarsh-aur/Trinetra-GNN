import express from 'express';
import {
  register,
  login,
  getMe,
  updateCloudProvider,
  logout,
  deleteAccount
} from '../controllers/authController.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes
router.get('/me', protect, getMe);
router.put('/cloud-provider', protect, updateCloudProvider);
router.post('/logout', protect, logout);
router.delete('/account', protect, deleteAccount);

export default router;