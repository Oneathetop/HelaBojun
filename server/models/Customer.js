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
    frequency_segment: { type: String, enum: ['low', 'medium', 'high', 'regular'], default: 'medium' },
    visits: [VisitSchema] // Embedded transaction history
}, { timestamps: true });

module.exports = mongoose.model('Customer', CustomerSchema, 'customers');
