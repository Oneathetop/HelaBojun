# MERN Stack System Architecture Blueprint: Hadabima NoSQL System

This specification blueprint outlines the complete production-grade MERN (MongoDB, Express, React, Node.js) system architecture designed for the Hadabima Database Management System. 

It provides the complete project directory layout, database connection patterns, Mongoose models, REST API controllers (implementing native MongoDB Aggregation pipelines for the required analytics), JWT authentication middleware, and React frontend views for the System Administrator interface.

---

## 1. Project Directory Structure

Below is the standard industrial directory structure for a decoupled MERN stack application. It maintains clear separation of concerns by keeping backend API logistics separate from frontend client presentation.

```text
hadabima-nosql-system/
├── client/                      # React Frontend Application
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── MetricCard.jsx   # Reusable KPI stats cards
│   │   │   └── Sidebar.jsx      # Navigation sidebar
│   │   ├── pages/
│   │   │   ├── Login.jsx        # sysAdmin login gateway
│   │   │   └── Dashboard.jsx    # Analytics dashboard
│   │   ├── App.css
│   │   ├── App.jsx
│   │   └── index.js
│   ├── package.json
│   └── README.md
│
├── server/                      # Node.js + Express backend server
│   ├── config/
│   │   └── db.js                # MongoDB connection handler
│   ├── controllers/
│   │   ├── analyticsController.js # Handles aggregations
│   │   └── authController.js    # Handles sysAdmin credentials
│   ├── middleware/
│   │   └── authMiddleware.js    # JWT payload verifier
│   ├── models/
│   │   ├── Admin.js             # sysAdmin schema
│   │   ├── Customer.js          # Customer schema with embedded visits
│   │   └── Vendor.js            # Vendor schema with embedded products
│   ├── routes/
│   │   ├── analyticsRoutes.js
│   │   └── authRoutes.js
│   ├── .env                     # Server environment configurations
│   ├── package.json
│   └── server.js                # Main server entrypoint
```

---

## 2. Backend Implementation (Node.js, Express, Mongoose)

### A. Environment Configurations (`server/.env`)
Stores secure runtime parameters, credentials, and connection strings.
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/hadabima_db
JWT_SECRET=HadaSecretKey_9876543210_Secure!
NODE_ENV=production
```

### B. Database Connection Handler (`server/config/db.js`)
Handles asynchronous pool connections to the MongoDB database.
```javascript
const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Database connection failed: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
```

### C. Mongoose Database Models (`server/models/`)

To optimize the prepaid cashier-to-cook transaction speed specified in the system notes, schemas are structured to use **nested documents** rather than independent relational collections. This eliminates overhead by avoiding relational `$lookup` joins on transactional requests.

#### 1. System Administrator (`server/models/Admin.js`)
Provides authentication fields for secure back-office analytical access.
```javascript
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const AdminSchema = new mongoose.Schema({
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    role: { type: String, default: 'System Administrator' }
}, { timestamps: true });

// Pre-save hashing middleware for passwords
AdminSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Compare password input against hashed DB value
AdminSchema.methods.comparePassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Admin', AdminSchema, 'sysadmins');
```

#### 2. Cooking Vendor (`server/models/Vendor.js`)
Embeds the menu catalog directly into individual vendor documents.
```javascript
const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    product_id: { type: String, required: true },
    product_name: { type: String, required: true },
    price: { type: Number, required: true },
    product_type: { type: String, required: true }
});

const VendorSchema = new mongoose.Schema({
    vendor_id: { type: String, required: true, unique: true },
    vendor_name: { type: String, required: true },
    food_type: { type: String, required: true },
    products: [ProductSchema] // Embedded products
}, { timestamps: true });

module.exports = mongoose.model('Vendor', VendorSchema, 'vendors');
```

#### 3. Customer & Visit History (`server/models/Customer.js`)
Links customer profiles to embedded arrays of historical purchases, avoiding a massive separate transactions table.
```javascript
const mongoose = require('mongoose');

const PurchasedItemSchema = new mongoose.Schema({
    product_id: { type: String, required: true },
    product_name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },
    vendor_id: { type: String, required: true },
    vendor_name: { type: String, required: true },
    product_type: { type: String, required: true }
});

const VisitSchema = new mongoose.Schema({
    visit_id: { type: String, required: true },
    visit_date: { type: String, required: true }, // Format: YYYY-MM-DD
    total_payment: { type: Number, required: true },
    purchased_items: [PurchasedItemSchema] // Nested transaction items
});

const CustomerSchema = new mongoose.Schema({
    customer_id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    city: { type: String, required: true },
    key_card_or_qr_code: { type: String, required: true, unique: true },
    frequency_segment: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    visits: [VisitSchema] // Embedded transaction history
}, { timestamps: true });

module.exports = mongoose.model('Customer', CustomerSchema, 'customers');
```

---

### D. Server Logic & API Controllers (`server/controllers/`)

#### 1. Authentication Controller (`server/controllers/authController.js`)
Handles secure administrative authentication and generates web session JWT tokens.
```javascript
const Admin = require('../models/Admin');
const jwt = require('jsonwebtoken');

exports.loginAdmin = async (req, res) => {
    const { username, password } = req.body;
    try {
        const admin = await Admin.findOne({ username });
        if (!admin) {
            return res.status(401).json({ success: false, message: 'Invalid administrative credentials' });
        }

        const isMatch = await admin.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid administrative credentials' });
        }

        // Generate JSON Web Token
        const token = jwt.sign(
            { id: admin._id, username: admin.username, role: admin.role },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.status(200).json({
            success: true,
            token,
            admin: { name: admin.name, username: admin.username, role: admin.role }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
```

#### 2. Analytical Engine Controller (`server/controllers/analyticsController.js`)
Implements aggregated analytical calculations requested in your system design notes.
```javascript
const Customer = require('../models/Customer');

// 1. Get total revenue overall and grouped by month
exports.getRevenueAnalytics = async (req, res) => {
    try {
        const stats = await Customer.aggregate([
            { $unwind: "$visits" },
            {
                $group: {
                    _id: { $substr: ["$visits.visit_date", 5, 2] }, // Extracts month code (06, 07, 08)
                    monthly_revenue: { $sum: "$visits.total_payment" },
                    visit_count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const totalResult = await Customer.aggregate([
            { $unwind: "$visits" },
            { $group: { _id: null, total_revenue: { $sum: "$visits.total_payment" } } }
        ]);

        res.json({
            success: true,
            total_revenue: totalResult[0]?.total_revenue || 0,
            monthly_breakdown: stats
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 2. Get monthly visits count for every customer
exports.getCustomerVisitsPerMonth = async (req, res) => {
    try {
        const visits = await Customer.aggregate([
            { $unwind: "$visits" },
            {
                $group: {
                    _id: {
                        customer_id: "$customer_id",
                        name: "$name",
                        month: { $substr: ["$visits.visit_date", 5, 2] }
                    },
                    visit_count: { $sum: 1 }
                }
            },
            { $sort: { "_id.customer_id": 1, "_id.month": 1 } }
        ]);
        res.json({ success: true, data: visits });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 3. Segment low frequency (avg < 2 visits/month) and high frequency (avg >= 6 visits/month) cohorts
exports.getCustomerSegmentation = async (req, res) => {
    try {
        const pipeline = (operator, value) => [
            { $unwind: "$visits" },
            {
                $group: {
                    _id: { customer_id: "$customer_id", name: "$name", month: { $substr: ["$visits.visit_date", 5, 2] } },
                    visits_this_month: { $sum: 1 }
                }
            },
            {
                $group: {
                    _id: { customer_id: "$_id.customer_id", name: "$_id.name" },
                    avg_visits_per_month: { $avg: "$visits_this_month" }
                }
            },
            { $match: { avg_visits_per_month: { [operator]: value } } },
            { $sort: { avg_visits_per_month: -1 } }
        ];

        const highFrequency = await Customer.aggregate(pipeline('$gte', 6));
        const lowFrequency = await Customer.aggregate(pipeline('$lt', 2));

        res.json({
            success: true,
            high_frequency_count: highFrequency.length,
            low_frequency_count: lowFrequency.length,
            high_frequency_list: highFrequency,
            low_frequency_list: lowFrequency
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 4. Get favorite items of high-frequency visitors (customers with avg >= 6 visits/month)
exports.getFrequentVisitorPreferences = async (req, res) => {
    try {
        const preferences = await Customer.aggregate([
            { $unwind: "$visits" },
            {
                $group: {
                    _id: { customer_id: "$customer_id", name: "$name", month: { $substr: ["$visits.visit_date", 5, 2] } },
                    visits_count: { $sum: 1 }
                }
            },
            {
                $group: {
                    _id: { customer_id: "$_id.customer_id", name: "$_id.name" },
                    avg_visits: { $avg: "$visits_count" }
                }
            },
            { $match: { avg_visits: { $gte: 6.0 } } },
            {
                $lookup: {
                    from: "customers",
                    localField: "_id.customer_id",
                    foreignField: "customer_id",
                    as: "details"
                }
            },
            { $unwind: "$details" },
            { $unwind: "$details.visits" },
            { $unwind: "$details.visits.purchased_items" },
            {
                $group: {
                    _id: {
                        customer_id: "$_id.customer_id",
                        name: "$_id.name",
                        product_name: "$details.visits.purchased_items.product_name"
                    },
                    total_quantity: { $sum: "$details.visits.purchased_items.quantity" }
                }
            },
            { $sort: { "_id.customer_id": 1, total_quantity: -1 } },
            {
                $group: {
                    _id: { customer_id: "$_id.customer_id", name: "$_id.name" },
                    favorites: {
                        $push: {
                            item: "$_id.product_name",
                            quantity_bought: "$total_quantity"
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    customer_id: "$_id.customer_id",
                    name: "$_id.name",
                    top_preferences: { $slice: ["$favorites", 3] }
                }
            }
        ]);
        res.json({ success: true, data: preferences });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 5. Get top 5 most bought items per month overall
exports.getMostBoughtItemsOverall = async (req, res) => {
    try {
        const report = await Customer.aggregate([
            { $unwind: "$visits" },
            { $unwind: "$visits.purchased_items" },
            {
                $group: {
                    _id: {
                        month: { $substr: ["$visits.visit_date", 5, 2] },
                        product_name: "$visits.purchased_items.product_name"
                    },
                    items_sold: { $sum: "$visits.purchased_items.quantity" }
                }
            },
            { $sort: { "_id.month": 1, items_sold: -1 } },
            {
                $group: {
                    _id: "$_id.month",
                    items: {
                        $push: {
                            product_name: "$_id.product_name",
                            quantity: "$items_sold"
                        }
                    }
                }
            },
            {
                $project: {
                    month: "$_id",
                    top_five_items: { $slice: ["$items", 5] },
                    _id: 0
                }
            },
            { $sort: { month: 1 } }
        ]);
        res.json({ success: true, data: report });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 6. Get geographic customer distribution and their purchased food items to formulate course expansion strategies
exports.getGeographicInsights = async (req, res) => {
    try {
        const insights = await Customer.aggregate([
            { $unwind: "$visits" },
            { $unwind: "$visits.purchased_items" },
            {
                $group: {
                    _id: {
                        city: "$city",
                        product_name: "$visits.purchased_items.product_name"
                    },
                    quantity_bought: { $sum: "$visits.purchased_items.quantity" }
                }
            },
            { $sort: { "_id.city": 1, quantity_bought: -1 } },
            {
                $group: {
                    _id: "$_id.city",
                    popular_items: {
                        $push: {
                            product_name: "$_id.product_name",
                            quantity: "$quantity_bought"
                        }
                    },
                    unique_customers: { $addToSet: "$_id.customer_id" } // Collects distinct buyers in city
                }
            },
            {
                $project: {
                    city: "$_id",
                    top_items: { $slice: ["$popular_items", 5] },
                    _id: 0
                }
            },
            { $sort: { city: 1 } }
        ]);
        res.json({ success: true, data: insights });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
```

---

### E. Middlewares & Routing Specifications (`server/routes/` & `server/middleware/`)

#### 1. JSON Web Token Middleware (`server/middleware/authMiddleware.js`)
Restricts backend data retrieval exclusively to verified administrative logins.
```javascript
const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Access denied. Administrative authentication missing.' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.admin = decoded;
        next();
    } catch (error) {
        res.status(401).json({ success: false, message: 'Invalid session or security signature.' });
    }
};
```

#### 2. Authentication Router (`server/routes/authRoutes.js`)
```javascript
const express = require('express');
const router = express.Router();
const { loginAdmin } = require('../controllers/authController');

router.post('/login', loginAdmin);

module.exports = router;
```

#### 3. Analytics Router (`server/routes/analyticsRoutes.js`)
```javascript
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
    getRevenueAnalytics,
    getCustomerVisitsPerMonth,
    getCustomerSegmentation,
    getFrequentVisitorPreferences,
    getMostBoughtItemsOverall,
    getGeographicInsights
} = require('../controllers/analyticsController');

// All backend data aggregations are secured behind administrative session tokens
router.use(authMiddleware);

router.get('/revenue', getRevenueAnalytics);
router.get('/visits-per-month', getCustomerVisitsPerMonth);
router.get('/segmentation', getCustomerSegmentation);
router.get('/frequent-preferences', getFrequentVisitorPreferences);
router.get('/most-bought', getMostBoughtItemsOverall);
router.get('/geographic-insights', getGeographicInsights);

module.exports = router;
```

#### 4. Express App Config (`server/server.js`)
Aggregates endpoints, configures JSON parsers, initializes database connections, and mounts Express listening ports.
```javascript
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();

// Enable secure cross-origin requests for decoupled React frontend
app.use(cors());
app.use(express.json());

// Link MongoDB Instance
connectDB();

// Mount Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Hadabima Backend Server executing on port ${PORT}`));
```

---

## 3. Frontend Implementation (React, Tailwind CSS, charts)

### A. Core Page Router (`client/src/App.jsx`)
Determines routing conditions using JWT-secured local storage validation.
```jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

const ProtectedRoute = ({ children }) => {
    const token = localStorage.getItem('hadaAdminToken');
    return token ? children : <Navigate to="/login" />;
};

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route 
                    path="/dashboard" 
                    element={
                        <ProtectedRoute>
                            <Dashboard />
                        </ProtectedRoute>
                    } 
                />
                <Route path="*" element={<Navigate to="/dashboard" />} />
            </Routes>
        </Router>
    );
}

export default App;
```

### B. Administrative Login Gate (`client/src/pages/Login.jsx`)
React input forms handling state mutations and local token caching.
```jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('http://localhost:5000/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (data.success) {
                localStorage.setItem('hadaAdminToken', data.token);
                localStorage.setItem('hadaAdminName', data.admin.name);
                navigate('/dashboard');
            } else {
                setError(data.message);
            }
        } catch (err) {
            setError('Connection to backend failed');
        }
    };

    return (
        <div className="flex h-screen items-center justify-center bg-stone-100">
            <form onSubmit={handleLogin} className="w-96 rounded-lg bg-white p-8 shadow-md border-t-4 border-emerald-600">
                <h2 className="mb-2 text-2xl font-bold text-stone-800">Hadabima NoSQL Admin</h2>
                <p className="mb-6 text-sm text-stone-500">Sign in to review database analytics & insights</p>
                {error && <div className="mb-4 text-sm text-red-600 bg-red-50 p-2 rounded">{error}</div>}
                
                <div className="mb-4">
                    <label className="block text-xs font-bold uppercase text-stone-600">Username</label>
                    <input 
                        type="text" 
                        value={username} 
                        onChange={(e) => setUsername(e.target.value)}
                        className="mt-1 w-full rounded border p-2 text-sm outline-none focus:border-emerald-600"
                        required 
                    />
                </div>
                
                <div className="mb-6">
                    <label className="block text-xs font-bold uppercase text-stone-600">Password</label>
                    <input 
                        type="password" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)}
                        className="mt-1 w-full rounded border p-2 text-sm outline-none focus:border-emerald-600"
                        required 
                    />
                </div>
                
                <button type="submit" className="w-full rounded bg-emerald-600 p-2.5 font-bold text-white transition hover:bg-emerald-700">
                    Authenticate
                </button>
            </form>
        </div>
    );
}
```

### C. Admin dashboard Console (`client/src/pages/Dashboard.jsx`)
Consumes API analytical endpoints, storing metrics state to render complex regional analytics, purchase patterns, and customer distributions.
```jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
    const navigate = useNavigate();
    const [revenueData, setRevenueData] = useState(null);
    const [segments, setSegments] = useState(null);
    const [geographic, setGeographic] = useState([]);
    const [loading, setLoading] = useState(true);

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    };

    useEffect(() => {
        const fetchDashboardData = async () => {
            const token = localStorage.getItem('hadaAdminToken');
            const headers = { 'Authorization': `Bearer ${token}` };

            try {
                const [revRes, segRes, geoRes] = await Promise.all([
                    fetch('http://localhost:5000/api/analytics/revenue', { headers }),
                    fetch('http://localhost:5000/api/analytics/segmentation', { headers }),
                    fetch('http://localhost:5000/api/analytics/geographic-insights', { headers })
                ]);

                const revJson = await revRes.json();
                const segJson = await segRes.json();
                const geoJson = await geoRes.json();

                if (revJson.success) setRevenueData(revJson);
                if (segJson.success) setSegments(segJson);
                if (geoJson.success) setGeographic(geoJson.data);
                
                setLoading(false);
            } catch (err) {
                console.error("Failed to load dashboard data", err);
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    if (loading) return <div className="flex h-screen items-center justify-center font-bold text-emerald-700">Loading Hadabima Analytics Engine...</div>;

    return (
        <div className="min-h-screen bg-stone-50 text-stone-800">
            {/* Header */}
            <header className="flex items-center justify-between bg-emerald-800 px-8 py-4 text-white shadow-md">
                <div>
                    <h1 className="text-xl font-bold">Hadabima NoSQL Management</h1>
                    <p className="text-xs text-emerald-200">Logged in as {localStorage.getItem('hadaAdminName') || 'SysAdmin'}</p>
                </div>
                <button onClick={handleLogout} className="rounded bg-emerald-700 px-4 py-2 text-sm font-semibold hover:bg-emerald-600 transition">
                    Logout
                </button>
            </header>

            {/* Dashboard Content */}
            <main className="mx-auto max-w-7xl p-8">
                {/* Stats Summary Cards */}
                <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
                    <div className="rounded-lg bg-white p-6 shadow-sm border-l-4 border-emerald-500">
                        <h4 className="text-sm font-semibold uppercase text-stone-500">Gross Total Revenue</h4>
                        <p className="text-3xl font-extrabold text-stone-900 mt-2">LKR {revenueData?.total_revenue.toLocaleString() || '0'}</p>
                    </div>
                    <div className="rounded-lg bg-white p-6 shadow-sm border-l-4 border-amber-500">
                        <h4 className="text-sm font-semibold uppercase text-stone-500">High-Frequency Cohort</h4>
                        <p className="text-3xl font-extrabold text-stone-900 mt-2">{segments?.high_frequency_count || 0} Customers</p>
                    </div>
                    <div className="rounded-lg bg-white p-6 shadow-sm border-l-4 border-red-500">
                        <h4 className="text-sm font-semibold uppercase text-stone-500">Low-Frequency Cohort</h4>
                        <p className="text-3xl font-extrabold text-stone-900 mt-2">{segments?.low_frequency_count || 0} Customers</p>
                    </div>
                </div>

                {/* Main Visual Sections */}
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                    {/* Monthly Revenue Chart representation */}
                    <div className="rounded-lg bg-white p-6 shadow-sm">
                        <h3 className="mb-4 text-lg font-bold text-stone-700">Monthly Revenue Distribution</h3>
                        <div className="space-y-4">
                            {revenueData?.monthly_breakdown.map((month) => (
                                <div key={month._id} className="flex items-center">
                                    <span className="w-16 text-sm font-bold text-stone-600">Month {month._id}</span>
                                    <div className="mr-4 flex-1 h-4 rounded bg-stone-100 overflow-hidden">
                                        <div 
                                            className="h-full bg-emerald-600 rounded" 
                                            style={{ width: `${(month.monthly_revenue / revenueData.total_revenue) * 200}%` }}
                                        ></div>
                                    </div>
                                    <span className="w-28 text-right text-sm font-bold text-stone-800">LKR {month.monthly_revenue.toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Regional Market Expansions */}
                    <div className="rounded-lg bg-white p-6 shadow-sm">
                        <h3 className="mb-4 text-lg font-bold text-stone-700">Provincial Cuisine Preferences</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-sm">
                                <thead>
                                    <tr className="border-b-2 border-stone-100 text-stone-500">
                                        <th className="pb-2">City</th>
                                        <th className="pb-2">Favorite Food Item</th>
                                        <th className="pb-2 text-right">Volume</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {geographic.map((geo, idx) => (
                                        <tr key={idx} className="border-b border-stone-50 hover:bg-stone-50/50">
                                            <td className="py-3 font-semibold text-stone-800">{geo.city}</td>
                                            <td className="py-3 text-stone-600">{geo.top_items[0]?.product_name || 'N/A'}</td>
                                            <td className="py-3 text-right font-bold text-emerald-700">{geo.top_items[0]?.quantity || 0} units</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* High frequency list for tracking */}
                <div className="mt-8 rounded-lg bg-white p-6 shadow-sm">
                    <h3 className="mb-4 text-lg font-bold text-stone-700">Frequent Customers (>= 6 visits/month)</h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                        {segments?.high_frequency_list.map((cust, i) => (
                            <div key={i} className="flex items-center justify-between rounded border border-stone-100 bg-stone-50/50 p-4">
                                <div>
                                    <h4 className="font-bold text-stone-800">{cust._id.name}</h4>
                                    <p className="text-xs text-stone-500">ID: {cust._id.customer_id}</p>
                                </div>
                                <span className="rounded bg-emerald-100 text-emerald-800 px-2.5 py-1 text-xs font-extrabold">
                                    {cust.avg_visits_per_month.toFixed(1)} visits/mo
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}
```

---

## 4. Run/Execution Guide

To start this system locally:

1. **Start the database backend:**
   ```bash
   cd server
   npm install express cors mongoose dotenv jsonwebtoken bcryptjs
   node server.js
   ```

2. **Start the client application:**
   ```bash
   cd client
   npm install react-router-dom
   npm start
   ```
