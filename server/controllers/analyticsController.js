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

// Get the number of recorded visits for each city, ordered from highest attendance to lowest
exports.getAttendanceByCity = async (req, res) => {
    try {
        const attendance = await Customer.aggregate([
            { $unwind: "$visits" },
            {
                $group: {
                    _id: "$city",
                    attendance_count: { $sum: 1 },
                    unique_customers: { $addToSet: "$customer_id" }
                }
            },
            {
                $project: {
                    _id: 0,
                    city: "$_id",
                    attendance_count: 1,
                    unique_customers: { $size: "$unique_customers" }
                }
            },
            { $sort: { attendance_count: -1, city: 1 } }
        ]);

        res.json({ success: true, data: attendance });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
