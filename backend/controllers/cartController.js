const Cart = require('../models/Cart');

// @desc Get Customer Cart from MongoDB Atlas
// @route GET /api/cart
exports.getCart = async (req, res) => {
    try {
        const userId = req.query.userId || req.user?.id || 'guest_user';
        let cart = await Cart.findOne({ userId });

        if (!cart) {
            cart = await Cart.create({ userId, items: [] });
        }

        res.json({ success: true, userId: cart.userId, items: cart.items || [] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc Add Item to Customer Cart in MongoDB Atlas
// @route POST /api/cart/add
exports.addToCart = async (req, res) => {
    try {
        const { userId = 'guest_user', product, quantity = 1 } = req.body;

        if (!product || (!product.name && !product.id)) {
            return res.status(400).json({ success: false, message: 'Invalid product data' });
        }

        let cart = await Cart.findOne({ userId });
        if (!cart) {
            cart = new Cart({ userId, items: [] });
        }

        const productId = String(product.id || `p_${Date.now()}`);
        const matchIndex = cart.items.findIndex(item =>
            item.id === productId ||
            (item.name && product.name && item.name.toLowerCase().trim() === product.name.toLowerCase().trim())
        );

        if (matchIndex > -1) {
            cart.items[matchIndex].quantity += Number(quantity);
        } else {
            cart.items.push({
                id: productId,
                name: product.name,
                brand: product.brand || 'Highland',
                storeName: product.storeName || 'PickFresh Super',
                category: product.category || 'Grocery',
                price: Number(product.price) || 0,
                unit: product.unit || '1kg',
                quantity: Number(quantity) || 1,
                stock: product.stock !== undefined ? product.stock : 50,
                image: product.image || '/cat_veg.png',
                useImageFile: product.useImageFile !== undefined ? product.useImageFile : true
            });
        }

        cart.updatedAt = new Date();
        await cart.save();

        res.json({ success: true, message: 'Item added to backend cart', items: cart.items });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc Update Item Quantity in Customer Cart in MongoDB Atlas
// @route PUT /api/cart/update
exports.updateCartQuantity = async (req, res) => {
    try {
        const { userId = 'guest_user', itemId, quantity } = req.body;

        let cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found' });
        }

        const newQty = Number(quantity);
        if (newQty <= 0) {
            cart.items = cart.items.filter(item => item.id !== String(itemId));
        } else {
            const itemIndex = cart.items.findIndex(item => item.id === String(itemId));
            if (itemIndex > -1) {
                cart.items[itemIndex].quantity = newQty;
            }
        }

        cart.updatedAt = new Date();
        await cart.save();

        res.json({ success: true, message: 'Cart item updated in backend', items: cart.items });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc Remove Item from Customer Cart in MongoDB Atlas
// @route DELETE /api/cart/item
exports.removeCartItem = async (req, res) => {
    try {
        const userId = req.query.userId || req.body.userId || 'guest_user';
        const itemId = req.query.itemId || req.body.itemId;

        let cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found' });
        }

        cart.items = cart.items.filter(item => item.id !== String(itemId));
        cart.updatedAt = new Date();
        await cart.save();

        res.json({ success: true, message: 'Item removed from backend cart', items: cart.items });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc Clear Customer Cart in MongoDB Atlas
// @route DELETE /api/cart/clear
exports.clearCart = async (req, res) => {
    try {
        const userId = req.query.userId || req.body.userId || 'guest_user';

        let cart = await Cart.findOne({ userId });
        if (cart) {
            cart.items = [];
            cart.updatedAt = new Date();
            await cart.save();
        }

        res.json({ success: true, message: 'Cart cleared from backend', items: [] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
