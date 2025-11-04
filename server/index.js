import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import authRoutes from './routes/auth.js';
// import graphRoutes from './routes/graphRoutes.js';
import * as graphController from './controllers/graphController.js';

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/graph', authRoutes);

// app.use('/api/graph', graphRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Trinetra Graph API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      register: '/api/auth/register',
      login: '/api/auth/login',
      me: '/api/auth/me (Protected)'
    }
  });
});

// Health check route
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'OK',
    message: 'Trinetra Security API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    database: 'Connected'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Start server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('\n' + '='.repeat(50));
  console.log('🚀 Trinetra Security Server Started');
  console.log('='.repeat(50));
  console.log(`📡 Environment: ${process.env.NODE_ENV}`);
  console.log(`🌐 Server URL: http://localhost:${PORT}`);
  console.log(`💚 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`🔐 Auth Endpoint: http://localhost:${PORT}/api/auth`);
  console.log(`📊 Graph API available at http://localhost:${PORT}/api/graph`);
  console.log('='.repeat(50) + '\n');
});

// Shutdown for Neo4j driver

process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await graphController.closeDriver();
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', async () => {
  await graphController.closeDriver();
  server.close(() => {
    process.exit(0);
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err.message);
  process.exit(1);
});