require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();

// Enable secure cross-origin requests for decoupled React frontend
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

// Link MongoDB Instance
connectDB();

// Mount Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Hadabima Backend Server executing on port ${PORT}`));