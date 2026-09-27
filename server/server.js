require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();

// Enable secure cross-origin requests for decoupled React frontend
const allowedOrigins = new Set(['http://localhost:5173', 'http://127.0.0.1:5173']);
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.has(origin)) return callback(null, true);
        return callback(new Error('Origin is not allowed by CORS'));
    },
    credentials: true
}));
app.use(express.json());

// Link MongoDB Instance
connectDB();

// Mount Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Hadabima Backend Server executing on port ${PORT}`));