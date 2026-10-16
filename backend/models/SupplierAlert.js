const mongoose = require('mongoose');

const supplierAlertSchema = new mongoose.Schema({
    productName: { type: String, required: true },
    supplierName: { type: String, required: true },
    currentStock: { type: Number, required: true },
    suggestedReorderQuantity: { type: Number, required: true, default: 20 },
    status: {
        type: String,
        enum: ['Low Stock Alert', 'Restock Requested', 'In Transit', 'Restocked'],
        default: 'Low Stock Alert'
    },
    estimatedDelivery: { type: String, default: 'Tomorrow, 10:30 AM' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SupplierAlert', supplierAlertSchema);
