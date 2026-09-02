const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const AdminSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    role: { type: String, default: 'System Administrator' }
}, { timestamps: true });

// Pre-save hashing middleware for passwords
AdminSchema.pre('save', async function () {
    if (!this.isModified('password')) return; // Exit early without calling 'next'
    
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    // No need to call next() here — Mongoose handles completion when the async function resolves
});

// Compare password input against hashed DB value
AdminSchema.methods.comparePassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Admin', AdminSchema, 'sysadmins');