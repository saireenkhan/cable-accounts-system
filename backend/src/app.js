require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const connectDB = require('./config/database');
const errorHandler = require('./middleware/error');
const logger = require('./utils/logger');

// ============================================================
// IMPORT ROUTES
// ============================================================

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
const partnerAreaRoutes = require('./routes/partnerAreaRoutes');
const partnerRoutes = require('./routes/partnerRoutes');

// ============================================================
// PROCESS ERROR HANDLERS
// ============================================================

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message);
});

// ============================================================
// EXPRESS APP
// ============================================================

const app = express();

app.set('trust proxy', 1);

// ============================================================
// DATABASE CONNECTION
// ============================================================

// Start connection without blocking application initialization.
// Individual API requests will also make sure DB is connected.
connectDB().catch((err) => {
  console.error(
    '❌ Initial MongoDB connection failed:',
    err.message
  );
});

// ============================================================
// SECURITY / BODY PARSING
// ============================================================

app.use(helmet());

app.use(
  cors({
    origin:
      process.env.CLIENT_URL ||
      'http://localhost:3000',
    credentials: true,
  })
);

app.use(
  express.json({
    limit: '10mb',
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: '10mb',
  })
);

// ============================================================
// DATABASE MIDDLEWARE
// Make sure MongoDB is connected before API requests
// ============================================================

app.use('/api', async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error(
      '❌ DB not ready:',
      err.message
    );

    return res.status(503).json({
      success: false,
      message: 'Database temporarily unavailable',
    });
  }
});

// ============================================================
// VERCEL / BACKEND TEST ENDPOINT
// IMPORTANT: This endpoint is intentionally simple.
// It does NOT access MongoDB.
// ============================================================

app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'Backend service is working',
    timestamp: new Date().toISOString(),
  });
});

// ============================================================
// HEALTH CHECK
// ============================================================

const healthHandler = (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
};

app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// ============================================================
// ROUTES
// ============================================================

app.use(
  '/api/whatsapp',
  require('./routes/whatsappRoutes')
);

app.use(
  '/api/partners-list',
  require('./routes/partnerListRoutes')
);

app.use(
  '/api/partner-payments',
  require('./routes/partnerPaymentRoutes')
);

app.use('/api/auth', authRoutes);

app.use('/api/customers', customerRoutes);

app.use('/api/bills', billRoutes);

app.use('/api/payments', paymentRoutes);

app.use('/api/packages', packageRoutes);

app.use('/api/dealers', dealerRoutes);

app.use(
  '/api/dealer-payments',
  dealerPaymentRoutes
);

app.use('/api/purchases', purchaseRoutes);

app.use('/api/areas', areaRoutes);

app.use('/api/staff', staffRoutes);

app.use('/api/attendance', attendanceRoutes);

app.use('/api/installation', installationRoutes);

app.use('/api/expenses', expenseRoutes);

app.use('/api/reports', reportRoutes);

app.use(
  '/api/dealer-areas',
  dealerAreaRoutes
);

app.use(
  '/api/partner-areas',
  partnerAreaRoutes
);

app.use(
  '/api/partners',
  partnerRoutes
);

// ============================================================
// ERROR HANDLER
// ============================================================

app.use(errorHandler);

// ============================================================
// LOCAL DEVELOPMENT SERVER
// Vercel handles production automatically.
// ============================================================

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;

  app.listen(PORT, () => {
    logger.info(
      `🚀 Server running on port ${PORT}`
    );

    logger.info(
      `📡 Environment: ${process.env.NODE_ENV}`
    );
  });
}

// ============================================================
// EXPORT EXPRESS APP
// ============================================================

module.exports = app;