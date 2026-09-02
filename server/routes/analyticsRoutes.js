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
