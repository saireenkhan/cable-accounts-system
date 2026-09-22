// require('dotenv').config();
// const express = require('express');
// const cors = require('cors');
// const helmet = require('helmet');
// const connectDB = require('./config/database');
// const errorHandler = require('./middleware/error');
// const logger = require('./utils/logger');
// const partnerAreaRoutes = require('./routes/partnerAreaRoutes');
// const partnerRoutes = require('./routes/partnerRoutes');



// // Import routes
// const authRoutes = require('./routes/authRoutes');
// const customerRoutes = require('./routes/customerRoutes');
// const billRoutes = require('./routes/billRoutes');
// const paymentRoutes = require('./routes/paymentRoutes');
// const packageRoutes = require('./routes/packageRoutes');
// const dealerRoutes = require('./routes/dealerRoutes');
// const dealerPaymentRoutes = require('./routes/dealerPaymentRoutes');
// const purchaseRoutes = require('./routes/purchaseRoutes');
// const areaRoutes = require('./routes/areaRoutes');
// const staffRoutes = require('./routes/staffRoutes');
// const attendanceRoutes = require('./routes/attendanceRoutes');
// const installationRoutes = require('./routes/installationRoutes');
// const expenseRoutes = require('./routes/expenseRoutes');
// const reportRoutes = require('./routes/reportRoutes');
// const dealerAreaRoutes = require('./routes/dealerAreaRoutes');

// // ✅ Prevent unhandled errors from crashing the serverless function
// process.on('unhandledRejection', (reason) => {
//   console.error('❌ Unhandled Rejection:', reason);
// });
// process.on('uncaughtException', (err) => {
//   console.error('❌ Uncaught Exception:', err.message);
// });

// const app = express();

// // ✅ Trust Vercel's proxy so rate limiting sees the real client IP
// app.set('trust proxy', 1);

// // Connect to database (non-blocking — don't crash function if Mongo is slow)
// connectDB().catch((err) => {
//   console.error('❌ Initial MongoDB connection failed:', err.message);
// });



// // Middleware
// // ✅ Ensure MongoDB is connected before handling API requests
// app.use('/api', async (req, res, next) => {
//   try {
//     await connectDB();
//   } catch (err) {
//     console.error('❌ DB not ready:', err.message);
//   }
//   next();
// });
// app.use(helmet());
// app.use(
//   cors({
//     origin: process.env.CLIENT_URL || 'http://localhost:3000',
//     credentials: true,
//   })
// );
// app.use(express.json({ limit: '10mb' }));
// app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// // Routes
// app.use('/api/whatsapp', require('./routes/whatsappRoutes'));
// app.use('/api/partners-list', require('./routes/partnerListRoutes'));
// app.use('/api/partner-payments', require('./routes/partnerPaymentRoutes'));
// app.use('/api/auth', authRoutes);
// app.use('/api/customers', customerRoutes);
// app.use('/api/bills', billRoutes);
// app.use('/api/payments', paymentRoutes);
// app.use('/api/packages', packageRoutes);
// app.use('/api/dealers', dealerRoutes);
// app.use('/api/dealer-payments', dealerPaymentRoutes);
// app.use('/api/purchases', purchaseRoutes);
// app.use('/api/areas', areaRoutes);
// app.use('/api/staff', staffRoutes);
// app.use('/api/attendance', attendanceRoutes);
// app.use('/api/installation', installationRoutes);
// app.use('/api/expenses', expenseRoutes);
// app.use('/api/reports', reportRoutes);
// app.use('/api/dealer-areas', dealerAreaRoutes);
// app.use('/api/partner-areas', partnerAreaRoutes);
// app.use('/api/partners', partnerRoutes);
// // Health check — responds at both /health (local) and /api/health (via Vercel rewrite)
// const healthHandler = (req, res) => {
//   res.json({
//     status: 'ok',
//     uptime: process.uptime(),
//     timestamp: new Date(),
//   });
// };

// app.get('/health', healthHandler);
// app.get('/api/health', healthHandler);

// // Error handler
// app.use(errorHandler);

// // Only listen locally — Vercel handles the server in production
// if (process.env.NODE_ENV !== 'production') {
//   const PORT = process.env.PORT || 5000;
//   app.listen(PORT, () => {
//     logger.info(`🚀 Server running on port ${PORT}`);
//     logger.info(`📡 Environment: ${process.env.NODE_ENV}`);
//   });
// }

// module.exports = app;
import axios from 'axios';

const isLocalhost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1');

const API_URL = isLocalhost
  ? 'http://localhost:5000/api'
  : '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================================
// REQUEST INTERCEPTOR
// Attach JWT token to every API request
// ============================================================
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = sessionStorage.getItem('token');

      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ============================================================
// RESPONSE INTERCEPTOR
// TEMPORARY DEBUG VERSION
// ============================================================
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    const method = error.config?.method || '';

    console.error('🔴 API ERROR:', {
      status,
      url,
      method,
      response: error.response?.data,
    });

    // ----------------------------------------------------------
    // TEMPORARY 401 DEBUGGING
    // ----------------------------------------------------------
    if (status === 401) {
      console.error('🔴 401 REQUEST:', {
        url,
        method,
      });

      console.error(
        '🔴 RESPONSE:',
        error.response?.data
      );

      console.error(
        '🔴 TOKEN STILL EXISTS:',
        !!sessionStorage.getItem('token')
      );

      /*
       * IMPORTANT:
       *
       * We are NOT deleting the token here temporarily.
       *
       * Previously, any protected API returning 401 would do:
       *
       * sessionStorage.removeItem('token');
       * sessionStorage.removeItem('user');
       * window.location.href = '/';
       *
       * That can cause:
       *
       * Login
       *   ↓
       * Dashboard
       *   ↓
       * API returns 401
       *   ↓
       * Token deleted
       *   ↓
       * Redirect to login
       *
       * We are disabling that temporarily so we can identify
       * which API request is actually failing.
       */
    }

    return Promise.reject(error);
  }
);

export default api;