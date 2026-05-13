// Entry point for the backend
const express = require('express');
const mongoose = require('mongoose');
const authRoutes = require('./routes/auth');
const machineRoutes = require('./routes/machines');
const customerRoutes = require('./routes/customers');
const rentalRoutes = require('./routes/rentals');
const maintenanceRoutes = require('./routes/maintenance');
const reportRoutes = require('./routes/reports');
const requestRoutes = require('./routes/requests'); // ✅ ADD THIS
const dotenv = require('dotenv');
const cors = require('cors');

// Load environment variables from .env file
dotenv.config();

const app = express();

const defaultAllowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  'https://rent-breaker-ms.vercel.app',
  'https://rent-breaker-pqai8j8df-musadiqhussain110s-projects.vercel.app',
];

const configuredAllowedOrigins = (process.env.FRONTEND_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = new Set([
  ...defaultAllowedOrigins,
  ...configuredAllowedOrigins,
]);

const defaultVercelPreviewOriginRegex = /^https:\/\/rent-breaker-[a-z0-9-]+-musadiqhussain110s-projects\.vercel\.app$/;
const vercelPreviewOriginRegex = (() => {
  if (!process.env.VERCEL_PREVIEW_ORIGIN_REGEX) {
    return defaultVercelPreviewOriginRegex;
  }

  try {
    return new RegExp(process.env.VERCEL_PREVIEW_ORIGIN_REGEX);
  } catch (error) {
    console.error('Invalid VERCEL_PREVIEW_ORIGIN_REGEX:', error.message);
    return defaultVercelPreviewOriginRegex;
  }
})();

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin) || vercelPreviewOriginRegex.test(origin)) {
      return callback(null, true);
    }

    return callback(new Error('CORS policy violation'));
  },
  credentials: true // if using cookies/auth
}));
app.use(express.json());

// MongoDB Connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/machines', machineRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/rentals', rentalRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/requests', requestRoutes); // ✅ ADD THIS

// 404 handler (optional but helpful)
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ message: err.message || 'Something broke!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
