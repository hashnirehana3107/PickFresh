const mongoose = require('mongoose');

const replenishmentSchema = new mongoose.Schema({
    poId: { type: String, required: true, unique: true },
    storeName: { type: String, required: true },
    storeEmail: { type: String, default: '' },
    supplierName: { type: String, default: '' },
    supplierEmail: { type: String, default: '' },
    product: { type: String, default: '' },
    unitsLeft: { type: Number, default: 0 },
    reorderUnits: { type: Number, default: 0 },
    ownerName: { type: String, default: '' },
    phone: { type: String, default: '' },
    city: { type: String, default: '' },
    address: { type: String, default: '' },
    itemsSummary: { type: String, default: '' },
    items: [{
        produce: String,
        name: String,
        wholesaleRate: Number,
        wholesalePrice: Number,
        qty: Number,
        unit: String,
        subtotal: Number,
        image: String,
        imageUrl: String
    }],
    totalAmount: { type: Number, default: 0 },
    status: {
        type: String,
        default: 'Pending Approval'
    },
    requestedDate: { type: Date, default: Date.now },
    deliveryTarget: { type: String, default: '' },
    driverName: { type: String, default: 'Kamal Wijekoon' },
    driverPhone: { type: String, default: '077 888 2211' },
    vehicleNo: { type: String, default: 'WP-GA-4521' },
    tempStorage: { type: String, default: '4.2°C (Optimal)' },
    etaMinutes: { type: Number, default: 24 },
    currentLocation: { type: String, default: 'High Level Road, Maharagama (En Route)' },
    highlight: { type: Boolean, default: false }
});

replenishmentSchema.index({ supplierEmail: 1 });
replenishmentSchema.index({ supplierName: 1 });
replenishmentSchema.index({ storeName: 1 });
replenishmentSchema.index({ storeEmail: 1 });
replenishmentSchema.index({ status: 1 });
replenishmentSchema.index({ requestedDate: -1 });

const SupplierReplenishment = mongoose.models.SupplierReplenishment || mongoose.model('SupplierReplenishment', replenishmentSchema);

module.exports = SupplierReplenishment;
