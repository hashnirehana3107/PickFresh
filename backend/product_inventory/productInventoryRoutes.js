const express = require('express');
const router = express.Router();
const {
    getDashboardStats,
    getProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    getSuppliers,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    getLowStockAnalytics,
    createRestockRequest,
    getRestockRequests,
    getCategories,
    addCategory,
    updateCategory,
    deleteCategory,
    getShopOwnerNotifications,
    getOfferBanner,
    saveOfferBanner,
    deleteOfferBanner
} = require('./productInventoryController');

// 0. Categories
router.get('/categories', getCategories);
router.post('/categories', addCategory);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

// 0b. Store Offer Banner
router.get('/offer-banner', getOfferBanner);
router.post('/offer-banner', saveOfferBanner);
router.delete('/offer-banner', deleteOfferBanner);

// 1. Dashboard & Notifications
router.get('/dashboard', getDashboardStats);
router.get('/notifications', getShopOwnerNotifications);

// 2, 3, 4, 5. Products CRUD
router.get('/products', getProducts);
router.post('/products', addProduct);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);

// 6, 7. Suppliers
router.get('/suppliers', getSuppliers);
router.post('/suppliers', addSupplier);
router.put('/suppliers/:id', updateSupplier);
router.delete('/suppliers/:id', deleteSupplier);

// 8. Low Stock Advanced Analytics
router.get('/low-stock-analytics', getLowStockAnalytics);

// 9. Restock Request PO
router.post('/restock-requests', createRestockRequest);
router.get('/restock-requests', getRestockRequests);

module.exports = router;
