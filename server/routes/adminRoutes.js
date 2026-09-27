const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const {
    listCustomers,
    createCustomer,
    updateCustomer,
    deleteCustomer
} = require('../controllers/adminController');

const router = express.Router();
router.use(authMiddleware);
router.get('/customers', listCustomers);
router.post('/customers', createCustomer);
router.patch('/customers/:id', updateCustomer);
router.delete('/customers/:id', deleteCustomer);

module.exports = router;
