import express from 'express';
import {
  register,
  login,
  getMe,
  updateCloudProvider,
  updateProfile,      // ← Make sure this is imported
  logout,
  deleteAccount,
  forgotPassword,
  resetPassword
} from '../controllers/authController.js';
import { protect } from '../middlewares/auth.js';
import { testConnection, getGraphData, getGraphStats } from '../controllers/graphController.js';

const router = express.Router();

// ========================================
// 🔐 AUTHENTICATION ROUTES
// ========================================

// Public auth routes
router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

// Protected auth routes
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);  // ← This line
router.put('/cloud-provider', protect, updateCloudProvider);
router.post('/logout', protect, logout);
router.delete('/account', protect, deleteAccount);

// ========================================
// 📊 GRAPH ROUTES (Neo4j)
// ========================================

// Test Neo4j connection
router.get('/graph/test', testConnection);

// Get graph data for visualization
router.get('/graph/data', getGraphData);

// Get graph statistics
router.get('/graph/stats', getGraphStats);

export default router;