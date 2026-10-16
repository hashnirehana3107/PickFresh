const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product');
const mongoose = require('mongoose');
const { invalidateProductsCache } = require('../product_inventory/productInventoryController');

// Seed mock orders
const seedOrders = [
    {
        orderNumber: 'PF-1030',
        customerName: 'Kamal Bandara',
        customerPhone: '0771234567',
        items: [
            { name: 'Fresh Red Tomatoes', price: 320, quantity: 2, unit: 'kg' },
            { name: 'Fresh White Bread', price: 190, quantity: 1, unit: 'loaf' }
        ],
        totalAmount: 830,
        pickupStore: 'PickFresh Super • Main Counter',
        pickupDate: 'Today',
        pickupTimeSlot: '4.30 PM - 5.00 PM',
        status: 'Pending',
        smartReplacementOptIn: true
    },
    {
        orderNumber: 'PF-1031',
        customerName: 'Thashmika Wickramasinghe',
        customerPhone: '0719876543',
        items: [
            { name: 'Keeri Samba Rice 5kg', price: 1450, quantity: 1, unit: 'bag' }
        ],
        totalAmount: 1450,
        pickupStore: 'TNW Supermart • Kollupitiya',
        pickupDate: 'Today',
        pickupTimeSlot: '5.00 PM - 5.30 PM',
        status: 'Ready for Pickup',
    }
];

// Helper function to calculate stock deduction weight in KG / Units based on unit type
const getUnitWeightKg = (unitStr) => {
    if (!unitStr) return 1.0;
    const cleanUnit = String(unitStr).toLowerCase().trim();
    if (cleanUnit.includes('250g')) return 0.25;
    if (cleanUnit.includes('500g')) return 0.50;
    if (cleanUnit.includes('200g')) return 0.20;
    if (cleanUnit.includes('100g')) return 0.10;
    if (cleanUnit.includes('kg')) return 1.0;
    return 1.0;
};

const generateUniqueOrderNumber = async () => {
    try {
        const allOrders = await Order.find({}, { orderNumber: 1 }).lean();
        const existingNumbers = new Set(allOrders.map(o => (o.orderNumber || '').trim()));

        // Extract all numeric portions from existing order numbers (e.g. PF-0011 -> 11, PF-1031 -> 1031)
        const numericValues = allOrders
            .map(o => {
                const m = (o.orderNumber || '').match(/\d+/);
                return m ? parseInt(m[0], 10) : 0;
            })
            .filter(n => n > 0);

        let nextNum = 1;
        if (numericValues.length > 0) {
            nextNum = Math.max(...numericValues) + 1;
        }

        let candidate = `PF-${String(nextNum).padStart(4, '0')}`;
        while (existingNumbers.has(candidate) || (await Order.exists({ orderNumber: candidate }))) {
            nextNum++;
            candidate = `PF-${String(nextNum).padStart(4, '0')}`;
        }

        return candidate;
    } catch (err) {
        const randomCode = Math.floor(1000 + Math.random() * 9000);
        return `PF-${randomCode}`;
    }
};

// @desc Create new pre-order (FR02 - CRUD Create)
// @route POST /api/orders
exports.createOrder = async (req, res) => {
    try {
        const { items, totalAmount, pickupDate, pickupTimeSlot, pickupStore, customerName, customerPhone, smartReplacementOptIn } = req.body;

        const sanitizedItems = Array.isArray(items) ? items.map(it => ({
            product: it._id || it.id || it.product,
            name: it.name || 'Grocery Item',
            price: Number(it.price) || 0,
            quantity: Number(it.quantity) || 1,
            unit: it.unit || '1kg',
            image: it.image || '/cat_veg.png'
        })) : [];

        let validCustomerId = null;
        if (req.user && req.user.id && mongoose.Types.ObjectId.isValid(req.user.id)) {
            validCustomerId = req.user.id;
        } else if (req.body.customerId && mongoose.Types.ObjectId.isValid(req.body.customerId)) {
            validCustomerId = req.body.customerId;
        }

        const rawCustomerEmail = (req.user && req.user.email) ? req.user.email : (req.body.customerEmail || '');
        const cleanCustomerEmail = rawCustomerEmail.trim().toLowerCase();

        let customerAvatar = (req.user && (req.user.picture || req.user.avatar || req.user.image)) ? (req.user.picture || req.user.avatar || req.user.image) : (req.body.customerAvatar || req.body.customerImage || '');
        
        if (!validCustomerId && cleanCustomerEmail) {
            try {
                const foundCust = await User.findOne({ email: new RegExp(`^${cleanCustomerEmail}$`, 'i') }).select('_id picture').lean();
                if (foundCust) {
                    validCustomerId = foundCust._id;
                    if (!customerAvatar && foundCust.picture) {
                        customerAvatar = foundCust.picture;
                    }
                }
            } catch (e) { }
        }

        if (!customerAvatar && validCustomerId) {
            try {
                const userObj = await User.findById(validCustomerId).select('picture').lean();
                if (userObj && userObj.picture) customerAvatar = userObj.picture;
            } catch (e) { }
        }

        const orderData = {
            customerName: customerName || (req.user ? (req.user.name || req.user.email) : 'Guest Customer'),
            customerEmail: cleanCustomerEmail,
            customerPhone: customerPhone || '0770000000',
            customerAvatar: customerAvatar,
            items: sanitizedItems,
            totalAmount: Number(totalAmount) || 0,
            pickupStore: pickupStore || 'PickFresh Super • Main Counter',
            pickupDate: pickupDate || 'Today',
            pickupTimeSlot: pickupTimeSlot || '4:30 PM - 5:00 PM',
            smartReplacementOptIn: smartReplacementOptIn !== undefined ? smartReplacementOptIn : true
        };

        if (validCustomerId) {
            orderData.customer = validCustomerId;
        }

        // Validate that requested pickup slot is not already full/unavailable
        try {
            const { getStoreSlots, formatSlotsWithOrders, matchSlotWithOrder } = require('../order_pickup/orderPickupController');
            if (getStoreSlots && formatSlotsWithOrders) {
                const { key, slots } = await getStoreSlots(orderData.pickupStore);
                const calculatedSlots = await formatSlotsWithOrders(slots, key);
                const matchingSlot = calculatedSlots.find(s => matchSlotWithOrder(orderData.pickupTimeSlot, s.time, s.duration));
                if (matchingSlot && (matchingSlot.full || matchingSlot.isFull || matchingSlot.isBlocked)) {
                    return res.status(400).json({
                        success: false,
                        message: `The selected pickup slot (${orderData.pickupTimeSlot}) is fully booked or unavailable. Please choose another slot.`
                    });
                }
            }
        } catch (slotValErr) {
            console.warn('Slot capacity pre-validation non-blocking catch:', slotValErr.message);
        }

        let order = null;
        let attempts = 0;
        let lastError = null;

        while (attempts < 5 && !order) {
            try {
                const orderNumber = await generateUniqueOrderNumber();
                orderData.orderNumber = orderNumber;
                order = await Order.create(orderData);
            } catch (err) {
                if (err.code === 11000 || (err.message && err.message.includes('11000'))) {
                    attempts++;
                    lastError = err;
                    await new Promise(r => setTimeout(r, 100));
                } else {
                    throw err;
                }
            }
        }

        if (!order) {
            throw lastError || new Error('Failed to create order due to duplicate key.');
        }

        // Deduct inventory stock in MongoDB Atlas based on ordered unit & quantity (e.g., 4 x 250g = 1kg deducted)
        for (const item of sanitizedItems) {
            try {
                let product = null;
                if (item.product && mongoose.Types.ObjectId.isValid(item.product)) {
                    product = await Product.findById(item.product);
                }
                if (!product && item.name) {
                    const cleanName = String(item.name).split('(')[0].trim();
                    product = await Product.findOne({
                        $or: [
                            { name: new RegExp('^' + item.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') },
                            { name: new RegExp(cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }
                        ]
                    });
                }

                if (product) {
                    const unitWeight = getUnitWeightKg(item.unit || product.unit);
                    const deductAmount = (Number(item.quantity) || 1) * unitWeight;
                    const currentStock = product.stock !== undefined ? product.stock : (product.stockQuantity || 0);
                    const newStock = Math.max(0, currentStock - deductAmount);

                    product.stock = newStock;
                    product.stockQuantity = newStock;
                    await product.save();
                }
            } catch (err) {
                console.warn(`Stock deduction warning for item ${item.name}:`, err.message);
            }
        }

        invalidateProductsCache();
        invalidateOrdersCache();
        try {
            const { invalidateCustomerShoppingCache } = require('../customer_shopping/customerShoppingController');
            invalidateCustomerShoppingCache();
        } catch (e) {}

        res.status(201).json({ success: true, message: 'Pre-order placed successfully', order });
    } catch (error) {
        console.error('Order creation DB error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

let allOrdersCache = null;
let allOrdersCacheTime = 0;
const ORDERS_TTL = 15 * 1000; // 15 seconds

const invalidateOrdersCache = () => {
    allOrdersCache = null;
    allOrdersCacheTime = 0;
};

// @desc Get all orders (FR04 - Order Dashboard)
// @route GET /api/orders
exports.getOrders = async (req, res) => {
    try {
        const { storeName, store, customerEmail, customerName, customerId } = req.query;
        const isGeneral = !storeName && !store && !customerEmail && !customerName && !customerId;

        if (isGeneral && allOrdersCache && (Date.now() - allOrdersCacheTime < ORDERS_TTL)) {
            return res.json({ success: true, count: allOrdersCache.length, orders: allOrdersCache });
        }

        let queryFilter = {};

        if (storeName || store) {
            const targetStore = (storeName || store).split(' - ')[0].trim();
            queryFilter.pickupStore = new RegExp(targetStore.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        }

        if (customerEmail || customerId) {
            const filterConditions = [];
            if (customerEmail && customerEmail.trim()) {
                filterConditions.push({ customerEmail: new RegExp(`^${customerEmail.trim()}$`, 'i') });
            }
            if (customerId && mongoose.Types.ObjectId.isValid(customerId)) {
                filterConditions.push({ customer: customerId });
            }
            if (filterConditions.length > 0) {
                queryFilter.$or = filterConditions;
            }
        } else if (customerName && customerName.trim()) {
            queryFilter.customerName = new RegExp(`^${customerName.trim()}$`, 'i');
        }

        let orders = await Order.find(queryFilter).sort({ createdAt: -1 }).limit(50).lean();

        // Seed mock orders ONLY if no store/customer filters were requested and DB is empty
        if (orders.length === 0 && !storeName && !store && !customerEmail && !customerName && !customerId) {
            const created = await Order.insertMany(seedOrders.map(o => ({
                ...o
            })));
            orders = created.map(c => c.toObject());
        }

        // Dynamically populate customer profile picture & product item images from MongoDB Atlas (Optimized batch lookup)
        const emailsToFetch = [...new Set(orders.map(o => o.customerEmail).filter(Boolean))];
        const idsToFetch = [...new Set(orders.map(o => o.customer).filter(id => id && mongoose.Types.ObjectId.isValid(id)))];

        let userMap = {};
        try {
            const [usersByEmail, usersById] = await Promise.all([
                emailsToFetch.length > 0 ? User.find({ email: { $in: emailsToFetch } }).select('picture name email').lean() : [],
                idsToFetch.length > 0 ? User.find({ _id: { $in: idsToFetch } }).select('picture name email').lean() : []
            ]);
            usersByEmail.forEach(u => { if (u.email && u.picture) userMap[u.email.toLowerCase().trim()] = u.picture; });
            usersById.forEach(u => { if (u._id && u.picture) userMap[u._id.toString()] = u.picture; });
        } catch (e) {
            console.warn('Batch avatar fetch warning:', e.message);
        }

        orders = orders.map(order => {
            if (!order) return order;
            const picFromId = order.customer ? userMap[order.customer.toString()] : null;
            const picFromEmail = order.customerEmail ? userMap[order.customerEmail.toLowerCase().trim()] : null;
            const foundPic = picFromId || picFromEmail;
            if (foundPic && foundPic.length > 10) {
                order.customerAvatar = foundPic;
                order.customerImage = foundPic;
            } else if (!order.customerAvatar || order.customerAvatar.includes('unsplash.com')) {
                const nameToUse = order.customerName || 'Customer';
                order.customerAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(nameToUse)}&background=E8F5E9&color=27672D&bold=true&font-size=0.45`;
                order.customerImage = order.customerAvatar;
            }
            if (Array.isArray(order.items)) {
                order.items = order.items.map(item => ({
                    ...item,
                    image: item.image && item.image !== '/cat_veg.png' ? item.image : '/cat_veg.png'
                }));
            }
            return order;
        });

        if (isGeneral) {
            allOrdersCache = orders;
            allOrdersCacheTime = Date.now();
        }

        res.json({ success: true, count: orders.length, orders });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Helper to enrich order object with dynamic customer avatar from User model and product item images from DB
const enrichOrderWithData = async (order) => {
    if (!order) return order;

    try {
        let userDoc = null;
        if (order.customer && mongoose.Types.ObjectId.isValid(order.customer)) {
            userDoc = await User.findById(order.customer).select('picture name email').lean();
        } else if (order.customerEmail) {
            userDoc = await User.findOne({ email: order.customerEmail.trim() }).select('picture name email').lean();
        }

        if (userDoc && userDoc.picture && userDoc.picture.length > 10) {
            order.customerAvatar = userDoc.picture;
            order.customerImage = userDoc.picture;
        }
    } catch (e) {
        console.warn('Enrich customer avatar error:', e.message);
    }

    // Default clean avatar fallback if missing or hardcoded unsplash photo
    if (!order.customerAvatar || order.customerAvatar.includes('unsplash.com')) {
        const nameToUse = order.customerName || 'Customer';
        order.customerAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(nameToUse)}&background=E8F5E9&color=27672D&bold=true&font-size=0.45`;
        order.customerImage = order.customerAvatar;
    }

    // Fast item image fallbacks
    if (Array.isArray(order.items)) {
        order.items = order.items.map(item => ({
            ...item,
            image: item.image && item.image !== '/cat_veg.png' ? item.image : '/cat_veg.png'
        }));
    }

    return order;
};

// @desc Get order details (FR03 - Live Tracking)
// @route GET /api/orders/:id
exports.getOrderById = async (req, res) => {
    try {
        const { id } = req.params;
        const cleanId = String(id).replace('#', '').trim();
        let order = null;

        if (mongoose.Types.ObjectId.isValid(id)) {
            order = await Order.findById(id).lean();
        }
        if (!order) {
            order = await Order.findOne({
                $or: [
                    { orderNumber: id },
                    { orderNumber: `#${cleanId}` },
                    { orderNumber: cleanId },
                    { orderNumber: new RegExp(`^#?${cleanId}$`, 'i') }
                ]
            }).lean();
        }

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        order = await enrichOrderWithData(order);

        res.json({ success: true, order });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc Update order status (FR06 - Status Update CRUD & Cancellation Restriction)
// @route PUT /api/orders/:id/status
exports.updateOrderStatus = async (req, res) => {
    try {
        const { status, cancellationReason, isCustomer } = req.body;
        const { id } = req.params;
        const cleanId = String(id).replace('#', '').trim();
        let order = null;

        if (mongoose.Types.ObjectId.isValid(id)) {
            order = await Order.findById(id);
        }
        if (!order) {
            order = await Order.findOne({
                $or: [
                    { orderNumber: id },
                    { orderNumber: `#${cleanId}` },
                    { orderNumber: cleanId },
                    { orderNumber: new RegExp(`^#?${cleanId}$`, 'i') }
                ]
            });
        }

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // Business Rule: Restrict customer self-cancellation if order is already Preparing, Ready for Pickup, or Completed
        if (status === 'Cancelled' && isCustomer) {
            const currentStatusNorm = (order.status || '').toLowerCase();
            if (['preparing', 'ready for pickup', 'collected', 'completed'].includes(currentStatusNorm)) {
                return res.status(400).json({
                    success: false,
                    message: `Order #${order.orderNumber || ''} is already ${order.status}. Items are currently packed by store, so it cannot be self-cancelled. Please contact the store.`
                });
            }
        }

        order.status = status;
        if (cancellationReason) {
            order.cancellationReason = cancellationReason;
        }
        await order.save();

        invalidateOrdersCache();
        try {
            const { invalidateCustomerShoppingCache } = require('../customer_shopping/customerShoppingController');
            invalidateCustomerShoppingCache();
        } catch (e) {}

        res.json({ success: true, message: `Order status updated to '${status}'`, order });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
