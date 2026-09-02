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
