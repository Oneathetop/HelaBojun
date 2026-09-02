// backend/scripts/seed.js
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Import your Mongoose models
const SysAdmin = require('./models/Admin');
const Vendor = require('./models/Vendor');
const Customer = require('./models/Customer');

// MongoDB Connection URI
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/hadabima_db';

async function seedDatabase() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB for seeding...');

    // Clear existing data to avoid duplicates
    await SysAdmin.deleteMany({});
    await Vendor.deleteMany({});
    await Customer.deleteMany({});
    console.log('Cleared existing collections.');

    // Load JSON datasets from the docs folder at project root
    const sysadmins = JSON.parse(fs.readFileSync(path.join(__dirname, '../docs/sysadmins-dataset.json'), 'utf-8'));
    const vendors = JSON.parse(fs.readFileSync(path.join(__dirname, '../docs/vendors-dataset.json'), 'utf-8'));
    const customers = JSON.parse(fs.readFileSync(path.join(__dirname, '../docs/customers-dataset.json'), 'utf-8'));

    // Insert data
    await SysAdmin.create(sysadmins);
    await Vendor.insertMany(vendors);
    await Customer.insertMany(customers);

    console.log(`Database Successfully Seeded!`);
    console.log(`- Seeded ${sysadmins.length} SysAdmin profiles.`);
    console.log(`- Seeded ${vendors.length} Vendor catalogs.`);
    console.log(`- Seeded ${customers.length} Customer transaction histories.`);

    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seedDatabase();
