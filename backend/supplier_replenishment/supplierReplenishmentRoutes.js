const express = require('express');
const router = express.Router();
const {
    getDashboardStats,
    getReplenishmentRequests,
    getRequestDetails,
    updatePOStatus,
    getStoreList,
    getDeliveryTracking,
    getNotifications,
    markNotificationRead,
    createNotification,
    getSupplierCatalog,
    addSupplierCatalogProduct,
    updateSupplierCatalogProduct,
    deleteSupplierCatalogProduct,
    deletePO
} = require('./supplierReplenishmentController');

// 1. Supplier Dashboard
router.get('/dashboard', getDashboardStats);

// 2, 3, 4. Replenishment Requests & Status Updates
router.get('/requests', getReplenishmentRequests);
router.get('/requests/:id', getRequestDetails);
router.put('/requests/:id/status', updatePOStatus);
router.put('/update-po-status/:id', updatePOStatus);
router.delete('/requests/:id', deletePO);
router.delete('/delete-po/:id', deletePO);

// 5. Retail Stores List
router.get('/stores', getStoreList);

// 6. Live Delivery Tracking
router.get('/delivery-tracking', getDeliveryTracking);

// 7. Supplier Notifications
router.get('/notifications', getNotifications);
router.put('/notifications/mark-read', markNotificationRead);
router.post('/notifications', createNotification);

// 8. Supplier Product Catalog (CRUD)
router.get('/catalog', getSupplierCatalog);
router.post('/catalog', addSupplierCatalogProduct);
router.put('/catalog/:id', updateSupplierCatalogProduct);
router.delete('/catalog/:id', deleteSupplierCatalogProduct);

module.exports = router;

