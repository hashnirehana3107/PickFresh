const mongoose = require('mongoose');

const supplierNotificationSchema = new mongoose.Schema({
    supplierName: { type: String, default: '' },
    supplierEmail: { type: String, default: '' },
    type: { type: String, enum: ['po', 'delivery', 'alert'], default: 'po' },
    title: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.SupplierNotification || mongoose.model('SupplierNotification', supplierNotificationSchema);
