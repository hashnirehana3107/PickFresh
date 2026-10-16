const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    orderId: { type: String, required: true, unique: true },
    customerName: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, default: '' },
    items: [{
        name: String,
        price: Number,
        qty: Number,
        unit: String
    }],
    totalAmount: { type: Number, required: true },
    status: {
        type: String,
        enum: ['New Pre-Order', 'Packing Items', 'Ready for Pickup', 'Completed', 'Cancelled'],
        default: 'New Pre-Order'
    },
    pickupSlot: { type: String, required: true },
    pickupLockerNo: { type: String, default: 'Locker #01' },
    paymentStatus: { type: String, default: 'Paid Online' },
    cancellationReason: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
});

const OrderPickup = mongoose.models.OrderPickup || mongoose.model('OrderPickup', orderSchema);

module.exports = OrderPickup;
