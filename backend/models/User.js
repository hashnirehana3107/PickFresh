const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, default: '' },   // optional for social-login users
    phone: { type: String, default: '' },
    role: {
        type: String,
        enum: ['customer', 'shop_owner', 'supplier'],
        default: 'customer'
    },
    // Social Auth Provider Info
    provider: { type: String, enum: ['email', 'google', 'apple'], default: 'email' },
    providerId: { type: String, default: '' },
    picture: { type: String, default: '' },
    // Shop Owner Specific Fields
    shopName: { type: String, default: '' },
    ownerName: { type: String, default: '' },
    storeAddress: { type: String, default: '' },
    storeStatus: { type: String, enum: ['open', 'closed'], default: 'open' },
    offerBanner: {
        hasCustomBanner: { type: Boolean, default: false },
        badge: { type: String, default: '🔥 20% OFF DEALS' },
        title: { type: String, default: 'Fresh Harvest Deals' },
        subtitle: { type: String, default: 'Pick up in 15 mins at nearest grocery store' },
        btnText: { type: String, default: 'Shop Now' },
        active: { type: Boolean, default: true },
        bannerBg: { type: String, default: '/banner_bg.png' }
    },
    // Supplier Specific Fields
    supplierName: { type: String, default: '' },
    contactPerson: { type: String, default: '' },
    driverName: { type: String, default: '' },
    defaultDriverName: { type: String, default: '' },
    vehicleNo: { type: String, default: '' },
    defaultVehicleNo: { type: String, default: '' },
    driversList: { type: Array, default: [] },
    supplyRegion: { type: String, default: '' },
    supplyRegions: { type: [String], default: [] },
    supplyCategory: { type: String, default: '' },
    supplyCategories: { type: [String], default: [] },
    linkedStores: { type: [String], default: [] },

    address: { type: String, default: '' },
    location: { type: String, default: '' },
    preferredLanguage: { type: String, enum: ['en', 'si', 'ta'], default: 'en' },
    createdAt: { type: Date, default: Date.now }
});

userSchema.index({ role: 1 });
userSchema.index({ supplierName: 1 });
userSchema.index({ shopName: 1 });

module.exports = mongoose.model('User', userSchema);
