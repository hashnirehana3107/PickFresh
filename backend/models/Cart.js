const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
    id: { type: String, required: true },
    name: { type: String, required: true },
    brand: { type: String, default: '' },
    storeName: { type: String, default: 'PickFresh Super' },
    category: { type: String, default: 'Grocery' },
    price: { type: Number, required: true },
    unit: { type: String, default: '1kg' },
    quantity: { type: Number, required: true, default: 1 },
    stock: { type: Number, default: 50 },
    image: { type: String, default: '/cat_veg.png' },
    useImageFile: { type: Boolean, default: true }
});

const cartSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    customerEmail: { type: String, default: '' },
    items: [cartItemSchema],
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Cart', cartSchema);
