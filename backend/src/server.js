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
app.use(cors());
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