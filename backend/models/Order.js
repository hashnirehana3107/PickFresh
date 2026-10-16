const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },
    unit: { type: String, default: 'item' },
    image: { type: String, default: '' },
    isReplaced: { type: Boolean, default: false },
    originalName: { type: String, default: '' }
});

const orderSchema = new mongoose.Schema({
    orderNumber: { type: String, required: true, unique: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    customerName: { type: String, required: true },
    customerEmail: { type: String, default: '' },
    customerPhone: { type: String, required: true },
    customerAvatar: { type: String, default: '' },
    items: [orderItemSchema],
    totalAmount: { type: Number, required: true },
    pickupStore: { type: String, default: 'Green Basket Grocery - Colombo 03' },
    pickupDate: { type: String, required: true },
    pickupTimeSlot: { type: String, required: true }, // e.g. "4:30 PM - 5:00 PM"
    qrToken: { type: String, default: '' },
    status: {
        type: String,
        enum: ['Pending', 'Accepted', 'Preparing', 'Processing', 'Ready for Pickup', 'Collected', 'Completed', 'Cancelled'],
        default: 'Pending'
    },
    paymentStatus: {
        type: String,
        enum: ['Pay at Pickup', 'Paid'],
        default: 'Pay at Pickup'
    },
    smartReplacementOptIn: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ customerEmail: 1, createdAt: -1 });
orderSchema.index({ customerName: 1 });
orderSchema.index({ pickupStore: 1, status: 1 });
orderSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
