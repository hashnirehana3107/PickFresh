const express = require('express');
const router = express.Router();
const {
    getCustomerHome,
    getStores,
    searchCustomerShopping,
    getProductDetails,
    createCheckoutOrder,
    getSmartReplacements,
    getOrderConfirmation,
    getCustomerProfile
} = require('./customerShoppingController');

// Optional auth middleware
const authMiddleware = (req, res, next) => {
    // Allows guest or authenticated requests seamlessly
    next();
};

// Customer Shopping Routes
router.get('/home', authMiddleware, getCustomerHome);
router.get('/stores', getStores);
router.get('/search', searchCustomerShopping);
router.get('/product/:id', getProductDetails);
router.post('/checkout', authMiddleware, createCheckoutOrder);
router.get('/smart-replacements', getSmartReplacements);
router.get('/order-confirmation/:orderNumber', getOrderConfirmation);
router.get('/profile', authMiddleware, getCustomerProfile);

module.exports = router;
