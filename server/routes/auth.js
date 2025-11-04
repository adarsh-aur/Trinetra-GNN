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
import { get } from 'mongoose';
import { testConnection, getGraphData, getGraphStats } from '../controllers/graphController.js';

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
router.get('/graph-display', getGraphData);
// // Test Neo4j connection
router.get('/test', testConnection);

// // Get graph data for visualization
router.get('/data', getGraphData);

// // Get graph statistics
router.get('/stats', getGraphStats);

export default router;