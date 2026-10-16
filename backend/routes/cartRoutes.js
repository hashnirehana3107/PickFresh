const express = require('express');
const router = express.Router();
const {
    getCart,
    addToCart,
    updateCartQuantity,
    removeCartItem,
    clearCart
} = require('../controllers/cartController');

router.get('/', getCart);
router.post('/add', addToCart);
router.put('/update', updateCartQuantity);
router.delete('/item', removeCartItem);
router.post('/item/delete', removeCartItem); // Support POST for ease
router.delete('/clear', clearCart);
router.post('/clear', clearCart); // Support POST for ease

module.exports = router;
