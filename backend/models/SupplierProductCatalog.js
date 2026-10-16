const mongoose = require('mongoose');

const supplierProductCatalogSchema = new mongoose.Schema({
    supplierEmail: { type: String, required: true, lowercase: true, trim: true, index: true },
    supplierName: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    brand: { type: String, default: '', trim: true },
    category: { type: String, default: 'General Wholesale', trim: true },
    price: { type: Number, default: 0 },
    wholesalePrice: { type: Number, default: 0 },
    wholesaleRate: { type: Number, default: 0 },
    minOrderQty: { type: Number, default: 1 },
    unit: { type: String, default: 'unit', trim: true },
    image: { type: String, default: '' },
    status: { type: String, enum: ['Available', 'Out of Stock'], default: 'Available' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SupplierProductCatalog', supplierProductCatalogSchema);
