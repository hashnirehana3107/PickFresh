const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true },
    price: { type: Number, required: true },
    costPrice: { type: Number, default: 0 },
    stock: { type: Number, default: 0 },
    stockQuantity: { type: Number, default: 0 },
    minStock: { type: Number, default: 10 },
    lowStockThreshold: { type: Number, default: 10 },
    status: { type: String, default: 'IN STOCK' },
    stockStatus: { type: String, default: 'In Stock' },
    storeName: { type: String, default: 'Lanka Mart' },
    image: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    fallbackEmoji: { type: String, default: '📦' },
    bgColor: { type: String, default: '#EFF6FF' },
    unit: { type: String, default: '1kg' },
    brand: { type: String, default: '' },
    description: { type: String, default: '' },
    supplierName: { type: String, default: 'Local Supplier' },
    supplierEmail: { type: String, default: '' },
    ownerEmail: { type: String, default: '' },
    storeEmail: { type: String, default: '' },
    storeIcon: { type: String, default: '' }, // For shop owner profile pic
    createdAt: { type: Date, default: Date.now }
});

// Sync aliases before saving to MongoDB
productSchema.pre('save', function (next) {
    if (!this.unit || this.unit === 'item') {
        this.unit = '1kg';
    }
    if (this.ownerEmail && !this.storeEmail) {
        this.storeEmail = this.ownerEmail;
    }
    if (this.storeEmail && !this.ownerEmail) {
        this.ownerEmail = this.storeEmail;
    }
    if (this.stock === undefined && this.stockQuantity !== undefined) {
        this.stock = this.stockQuantity;
    }
    if (this.stockQuantity === undefined && this.stock !== undefined) {
        this.stockQuantity = this.stock;
    }
    if (this.minStock === undefined && this.lowStockThreshold !== undefined) {
        this.minStock = this.lowStockThreshold;
    }
    if (this.image && !this.imageUrl) {
        this.imageUrl = this.image;
    }
    if (this.imageUrl && !this.image) {
        this.image = this.imageUrl;
    }

    if (this.stock <= 0) {
        this.status = 'OUT OF STOCK';
        this.stockStatus = 'Out of Stock';
    } else if (this.stock <= this.minStock) {
        this.status = 'LOW STOCK';
        this.stockStatus = 'Low Stock';
    } else {
        this.status = 'IN STOCK';
        this.stockStatus = 'In Stock';
    }
    next();
});

productSchema.index({ name: 1 });
productSchema.index({ supplierName: 1 });
productSchema.index({ ownerEmail: 1, createdAt: -1 });
productSchema.index({ storeEmail: 1, createdAt: -1 });
productSchema.index({ storeName: 1 });
productSchema.index({ category: 1 });

module.exports = mongoose.models.Product || mongoose.model('Product', productSchema);
