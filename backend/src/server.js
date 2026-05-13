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
const aiRoutes = require('./routes/ai');
const dotenv = require('dotenv');
const cors = require('cors');

// Load environment variables from .env file
dotenv.config();

const app = express();
const configuredOrigins = (process.env.FRONTEND_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const allowedOrigins = configuredOrigins.length
  ? configuredOrigins
  : [
      'https://rent-breaker-ms.vercel.app',
      'https://rent-breaker-pqai8j8df-musadiqhussain110s-projects.vercel.app',
      'http://localhost:5173'
    ];
const vercelPreviewOriginRegex = new RegExp(
  process.env.VERCEL_PREVIEW_ORIGIN_REGEX ||
    '^https://rent-breaker-[a-z0-9-]+-musadiqhussain110s-projects\\.vercel\\.app$',
  'i'
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);

      const isVercelPreview = vercelPreviewOriginRegex.test(origin);
      if (isVercelPreview) return callback(null, true);

      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
  })
);
app.use(express.json());

// MongoDB Connection
const mongoUri = process.env.MONGODB_URI || process.env.DB_CONNECTION;
if (!mongoUri) {
  console.error('Missing MongoDB connection string. Set MONGODB_URI (or legacy DB_CONNECTION).');
  process.exit(1);
}

mongoose
  .connect(mongoUri)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Routes
app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'backend' });
});

app.use('/api/auth', authRoutes);
app.use('/api/machines', machineRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/rentals', rentalRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/requests', requestRoutes); // ✅ ADD THIS
app.use('/api/ai', aiRoutes);

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
