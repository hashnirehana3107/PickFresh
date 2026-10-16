const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Connect to Database & Pre-warm Cache
connectDB().then(() => {
    try {
        const { prewarmSupplierReplenishmentCache } = require('./supplier_replenishment/supplierReplenishmentController');
        if (prewarmSupplierReplenishmentCache) {
            prewarmSupplierReplenishmentCache().catch(() => { });
        }
        const { prewarmProductsCache } = require('./product_inventory/productInventoryController');
        if (prewarmProductsCache) {
            prewarmProductsCache().catch(() => { });
        }
    } catch (e) { }
});

const app = express();

// Body Parser & CORS Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Basic Healthcheck API Endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'online',
        app: 'PickFresh Mobile Backend API',
        group: 'KND_HCI_G10',
        timestamp: new Date().toISOString()
    });
});

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/cart', require('./routes/cartRoutes'));
app.use('/api/suppliers', require('./routes/supplierRoutes'));
app.use('/api/customer-shopping', require('./customer_shopping/customerShoppingRoutes'));
app.use('/api/product-inventory', require('./product_inventory/productInventoryRoutes'));
app.use('/api/order-pickup', require('./order_pickup/orderPickupRoutes'));
app.use('/api/supplier-replenishment', require('./supplier_replenishment/supplierReplenishmentRoutes'));

// 404 Handler
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'API Endpoint not found' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 PickFresh Backend Server running on port ${PORT}`);
    console.log(`🌐 Base API URL: http://localhost:${PORT}/api`);
    console.log(`=======================================================`);
});
