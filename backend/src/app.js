require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/database');
const errorHandler = require('./middleware/error');
const logger = require('./utils/logger');

// Import routes
const authRoutes = require('./routes/authRoutes');
const customerRoutes = require('./routes/customerRoutes');
const billRoutes = require('./routes/billRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const packageRoutes = require('./routes/packageRoutes');
const dealerRoutes = require('./routes/dealerRoutes');
const dealerPaymentRoutes = require('./routes/dealerPaymentRoutes');
const purchaseRoutes = require('./routes/purchaseRoutes');
const areaRoutes = require('./routes/areaRoutes');
const staffRoutes = require('./routes/staffRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const installationRoutes = require('./routes/installationRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const reportRoutes = require('./routes/reportRoutes');
const dealerAreaRoutes = require('./routes/dealerAreaRoutes');
// ... rest of the code
const app = express();

// Connect to database
connectDB().catch((err) => {
  console.error('❌ Initial MongoDB connection failed:', err.message);
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/api', limiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/dealers', dealerRoutes);
app.use('/api/dealer-payments', dealerPaymentRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/areas', areaRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/installation', installationRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/dealer-areas', dealerAreaRoutes);
// Health check
// Health check — responds at both /health (local) and /api/health (via Vercel rewrite)
const healthHandler = (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date(),
  });
};

app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// Error handler
app.use(errorHandler);

// Only listen locally — Vercel handles the server in production
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    logger.info(`🚀 Server running on port ${PORT}`);
    logger.info(`📡 Environment: ${process.env.NODE_ENV}`);
  });
}

module.exports = app;