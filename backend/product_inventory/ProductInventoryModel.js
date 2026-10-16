const mongoose = require('mongoose');
const Product = require('../models/Product');

const supplierSchema = new mongoose.Schema({
    name: { type: String, required: true },
    contactPerson: { type: String, default: '' },
    phone: { type: String, required: true },
    email: { type: String, default: '' },
    category: { type: String, default: '' },
    region: { type: String, default: '' },
    paymentTerms: { type: String, default: '7 Days Credit' },
    rating: { type: String, default: '4.8 ★' },
    status: { type: String, default: 'ACTIVE' },
    suppliedProducts: { type: [String], default: [] },
    linkedStores: { type: [String], default: [] }, // Array of owner emails who added this supplier
    createdAt: { type: Date, default: Date.now }
});

const restockRequestSchema = new mongoose.Schema({
    poNumber: { type: String, default: '' },
    storeName: { type: String, default: '' },
    storeEmail: { type: String, default: '' },
    supplierName: { type: String, required: true },
    supplierEmail: { type: String, default: '' },
    deliveryDate: { type: String, required: true },
    items: [{
        name: String,
        qty: Number,
        unit: String,
        image: String,
        imageUrl: String,
        wholesalePrice: Number,
        wholesaleRate: Number,
        price: Number,
        estPrice: Number
    }],
    totalEstimate: { type: Number, default: 0 },
    notes: { type: String, default: '' },
    status: { type: String, default: 'Pending' },
    deliveryTarget: { type: String, default: '' },
    etaMinutes: { type: Number, default: 24 },
    driverName: { type: String, default: 'Kamal Wijekoon' },
    driverPhone: { type: String, default: '077 888 2211' },
    vehicleNo: { type: String, default: 'WP-GA-4521' },
    tempStorage: { type: String, default: '4.2°C (Optimal)' },
    currentLocation: { type: String, default: 'High Level Road, Maharagama (En Route)' },
    createdAt: { type: Date, default: Date.now }
});

supplierSchema.index({ email: 1 });
supplierSchema.index({ name: 1 });

restockRequestSchema.index({ poNumber: 1 });
restockRequestSchema.index({ supplierName: 1 });
restockRequestSchema.index({ supplierEmail: 1 });
restockRequestSchema.index({ storeEmail: 1 });
restockRequestSchema.index({ storeName: 1 });
restockRequestSchema.index({ status: 1 });
restockRequestSchema.index({ createdAt: -1 });
restockRequestSchema.index({ supplierName: 1, supplierEmail: 1 });

const Supplier = mongoose.models.Supplier || mongoose.model('Supplier', supplierSchema);
const RestockRequest = mongoose.models.RestockRequest || mongoose.model('RestockRequest', restockRequestSchema);

module.exports = { Product, Supplier, RestockRequest };
