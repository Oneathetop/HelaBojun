const Customer = require('../models/Customer');

exports.listCustomers = async (req, res) => {
    try {
        const search = String(req.query.search || '').trim();
        const filter = search ? {
            $or: [
                { customer_id: { $regex: search, $options: 'i' } },
                { name: { $regex: search, $options: 'i' } }
            ]
        } : {};
        const data = await Customer.find(filter).sort({ customer_id: 1 }).lean();
        return res.json({ success: true, data });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

exports.createCustomer = async (req, res) => {
    try {
        const customer = await Customer.create(req.body);
        return res.status(201).json({ success: true, data: customer });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

exports.updateCustomer = async (req, res) => {
    try {
        const customer = await Customer.findOneAndUpdate(
            { customer_id: req.params.id },
            req.body,
            { new: true, runValidators: true }
        ).lean();
        if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
        return res.json({ success: true, data: customer });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

exports.deleteCustomer = async (req, res) => {
    try {
        const result = await Customer.deleteOne({ customer_id: req.params.id });
        if (!result.deletedCount) return res.status(404).json({ success: false, message: 'Customer not found' });
        return res.json({ success: true, message: 'Customer deleted' });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};
