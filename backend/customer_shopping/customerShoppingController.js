const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const Category = require('../models/Category');
const mongoose = require('mongoose');
const connectDB = require('../config/db');

let customerHomeCache = null;
let customerHomeCacheTime = 0;
let storesCache = null;
let storesCacheTime = 0;
const CACHE_TTL = 30 * 1000; // 30 seconds

const invalidateCustomerShoppingCache = () => {
    customerHomeCache = null;
    customerHomeCacheTime = 0;
    storesCache = null;
    storesCacheTime = 0;
};
exports.invalidateCustomerHomeCache = invalidateCustomerShoppingCache;
exports.invalidateCustomerShoppingCache = invalidateCustomerShoppingCache;

const getCategoryImageFallback = (catName = '', prodName = '') => {
    const combined = `${catName} ${prodName}`.toLowerCase();
    if (combined.includes('milk') || combined.includes('dairy') || combined.includes('cheese') || combined.includes('egg')) return '/cat_dairy.png';
    if (combined.includes('fruit') || combined.includes('avocado') || combined.includes('apple') || combined.includes('strawberry')) return '/cat_fruits.png';
    if (combined.includes('bread') || combined.includes('bakery') || combined.includes('bun')) return '/cat_bakery.png';
    if (combined.includes('drink') || combined.includes('beverage') || combined.includes('coke') || combined.includes('juice')) return '/cat_beverages.png';
    return '/cat_veg.png';
};

// 1. GET Customer Home Data (Featured products, active order status, stores, top categories)
exports.getCustomerHome = async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            try { await connectDB(); } catch (e) {}
        }

        const isFresh = customerHomeCache && (Date.now() - customerHomeCacheTime < CACHE_TTL);

        // If cache is fresh and not an authenticated user needing unique active pre-order, return immediately (0ms)
        if (isFresh && !req.user) {
            return res.json(customerHomeCache);
        }

        // If cache is fresh and authenticated user, reuse cached public data and ONLY query the single activeOrder!
        if (isFresh && req.user) {
            let activeOrder = null;
            try {
                activeOrder = await Order.findOne({ customer: req.user._id, status: { $in: ['Pending', 'Preparing', 'Ready for Pickup'] } }).sort({ createdAt: -1 }).lean().exec();
            } catch (e) {}
            return res.json({
                ...customerHomeCache,
                activeOrder
            });
        }

        // Execute MongoDB Atlas queries concurrently in parallel with .lean() optimization
        const [rawProducts, shopOwners, rawCategoryList, dbCategories] = await Promise.all([
            Product.find({}).sort({ createdAt: -1 }).limit(10).lean().exec(),
            User.find({ role: 'shop_owner' }).select('name email shopName storeAddress address location phone rating storeStatus picture offerBanner').lean().exec(),
            Product.find({}).select('category').lean().exec(),
            Category.find({}).lean().exec()
        ]);

        let featuredProducts = rawProducts.map(p => {
            const imgUrl = p.imageUrl || p.image || '';
            const fallbackImg = getCategoryImageFallback(p.category, p.name);
            const hasValidImg = imgUrl && (imgUrl.startsWith('data:') || imgUrl.startsWith('http') || imgUrl.startsWith('/'));
            return {
                id: p._id.toString(),
                _id: p._id.toString(),
                name: p.name,
                category: p.category || 'Grocery',
                price: p.price,
                unit: p.unit || '1kg',
                stock: p.stock !== undefined ? p.stock : (p.stockQuantity !== undefined ? p.stockQuantity : 10),
                minStock: p.minStock || 5,
                brand: p.brand || '',
                storeName: p.storeName || 'Lanka Mart',
                image: hasValidImg ? imgUrl : fallbackImg,
                useImageFile: !imgUrl.startsWith('data:')
            };
        });

        let stores = shopOwners.map((u, i) => {
            const isClosed = u.storeStatus === 'closed';
            const storeLoc = u.location || '';
            const fullAddr = u.storeAddress || u.address || storeLoc || 'Colombo, Sri Lanka';
            return {
                id: u._id.toString(),
                name: u.shopName || (u.name ? `${u.name}'s Store` : 'Fresh Grocery Store'),
                email: u.email || '',
                storeEmail: u.email || '',
                ownerEmail: u.email || '',
                ownerName: u.name || 'Shop Owner',
                address: fullAddr,
                storeAddress: u.storeAddress || '',
                location: storeLoc,
                picture: u.picture || '',
                distance: `${(1.0 + (i % 5) * 0.4).toFixed(1)} km`,
                rating: u.rating || '4.9 ★',
                status: isClosed ? 'Closed' : 'Open • Pick up in 30m',
                storeStatus: u.storeStatus || 'open'
            };
        });

        const countMap = {};
        (rawCategoryList || []).forEach(p => {
            if (p.category) {
                const k = p.category.toLowerCase().trim();
                countMap[k] = (countMap[k] || 0) + 1;
            }
        });

        let topCategories = [];

        if (dbCategories.length > 0) {
            topCategories = dbCategories.map((cat, idx) => {
                const count = countMap[cat.name.toLowerCase()] || 0;
                return {
                    id: cat._id.toString(),
                    name: cat.name,
                    items: `${count} ${count === 1 ? 'item' : 'items'}`,
                    count: count,
                    image: cat.image || '',
                    fallbackEmoji: cat.fallbackEmoji || '📦',
                    color: cat.color || '#E8F5E9',
                    textColor: cat.textColor || '#2E7D32'
                };
            });
            topCategories.sort((a, b) => b.count - a.count);
            topCategories = topCategories.slice(0, 6);
        }

        if (topCategories.length === 0) {
            topCategories = [
                { id: 1, name: 'Vegetables', items: '24 items', image: '/veg_icon.png', color: '#E8F5E9', textColor: '#2E7D32', fallbackEmoji: '🥕' },
                { id: 2, name: 'Fruits', items: '12 items', image: '/fruit_icon.png', color: '#FFF3E0', textColor: '#E65100', fallbackEmoji: '🥑' },
                { id: 3, name: 'Dairy', items: '8 items', image: '/dairy_icon.png', color: '#E3F2FD', textColor: '#1565C0', fallbackEmoji: '🥛' },
                { id: 4, name: 'Bakery', items: '15 items', image: '/bakery_icon.png', color: '#FCE4EC', textColor: '#C2185B', fallbackEmoji: '🍞' }
            ];
        }

        // Active pre-order for user if logged in
        let activeOrder = null;
        if (req.user) {
            activeOrder = await Order.findOne({ customer: req.user._id, status: { $in: ['Pending', 'Preparing', 'Ready for Pickup'] } }).sort({ createdAt: -1 }).lean().exec();
        }

        // Build ALL active banners from all registered store owners
        const allBanners = shopOwners
            .filter(s => s.offerBanner && s.offerBanner.hasCustomBanner !== false && s.offerBanner.active !== false && s.offerBanner.title && s.offerBanner.title.trim().length > 0)
            .map(s => ({
                ...s.offerBanner,
                storeName: s.shopName || s.name || 'GroceryMart',
                storeId: s._id.toString()
            }));

        // Fallback banner if no stores have created banners yet
        const defaultBanner = {
            badge: '🔥 20% OFF DEALS',
            title: 'Fresh Harvest Deals',
            subtitle: 'Pick up in 15 mins at nearest grocery store',
            btnText: 'Shop Now',
            active: true,
            bannerBg: '/banner_bg.png',
            storeName: 'GroceryMart'
        };

        const activeBanner = allBanners.length > 0 ? allBanners[0] : defaultBanner;

        const responsePayload = {
            success: true,
            featuredProducts,
            stores,
            topCategories,
            activeOrder,
            activeBanner,
            allBanners: allBanners.length > 0 ? allBanners : [defaultBanner]
        };

        // Cache public home data & stores
        customerHomeCache = responsePayload;
        customerHomeCacheTime = Date.now();
        storesCache = stores;
        storesCacheTime = Date.now();

        return res.json(responsePayload);
    } catch (error) {
        console.error('Error fetching customer home data:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// GET All Registered Stores (RAM Cached & Optimized with .lean())
exports.getStores = async (req, res) => {
    try {
        if (storesCache && (Date.now() - storesCacheTime < CACHE_TTL)) {
            return res.json({ success: true, count: storesCache.length, stores: storesCache });
        }

        const shopOwners = await User.find({ role: 'shop_owner' }).select('name email shopName storeAddress address location phone rating storeStatus picture').lean().exec();

        let stores = shopOwners.map((u, i) => {
            const isClosed = u.storeStatus === 'closed';
            const storeLoc = u.location || '';
            const fullAddr = u.storeAddress || u.address || storeLoc || 'Colombo, Sri Lanka';
            return {
                id: u._id.toString(),
                name: u.shopName || (u.name ? `${u.name}'s Store` : 'Fresh Grocery Store'),
                email: u.email || '',
                storeEmail: u.email || '',
                ownerEmail: u.email || '',
                ownerName: u.name || 'Shop Owner',
                address: fullAddr,
                storeAddress: u.storeAddress || '',
                location: storeLoc,
                picture: u.picture || '',
                distance: `${(1.2 + (i % 5) * 0.4).toFixed(1)} km`,
                rating: u.rating || '4.9',
                reviews: 45 + (i * 12),
                status: isClosed ? 'Closed' : 'Open • Pick up in 30m',
                storeStatus: u.storeStatus || 'open',
                timing: isClosed ? 'Closed Today' : '8:00 AM - 10:00 PM',
                itemsCount: '100+ products'
            };
        });

        storesCache = stores;
        storesCacheTime = Date.now();

        res.json({ success: true, count: stores.length, stores });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 2. SEARCH Products & Stores (Optimized with .lean() & limit)
exports.searchCustomerShopping = async (req, res) => {
    try {
        const { query, category } = req.query;
        let filter = {};

        if (query) {
            filter.name = { $regex: query, $options: 'i' };
        }
        if (category && category !== 'All') {
            filter.category = category;
        }

        const products = await Product.find(filter).sort({ createdAt: -1 }).limit(60).lean().exec();
        res.json({ success: true, count: products.length, products });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Background pre-warmer for customer shopping cache
const prewarmCustomerShoppingCache = async () => {
    try {
        const [rawProducts, shopOwners, rawCategoryList, dbCategories] = await Promise.all([
            Product.find({}).sort({ createdAt: -1 }).limit(10).lean().exec(),
            User.find({ role: 'shop_owner' }).select('name email shopName storeAddress address location phone rating storeStatus picture offerBanner').lean().exec(),
            Product.find({}).select('category').lean().exec(),
            Category.find({}).lean().exec()
        ]);

        let featuredProducts = rawProducts.map(p => {
            const imgUrl = p.imageUrl || p.image || '';
            const fallbackImg = getCategoryImageFallback(p.category, p.name);
            const hasValidImg = imgUrl && (imgUrl.startsWith('data:') || imgUrl.startsWith('http') || imgUrl.startsWith('/'));
            return {
                id: p._id.toString(),
                _id: p._id.toString(),
                name: p.name,
                category: p.category || 'Grocery',
                price: p.price,
                unit: p.unit || '1kg',
                stock: p.stock !== undefined ? p.stock : (p.stockQuantity !== undefined ? p.stockQuantity : 10),
                minStock: p.minStock || 5,
                brand: p.brand || '',
                storeName: p.storeName || 'Lanka Mart',
                image: hasValidImg ? imgUrl : fallbackImg,
                useImageFile: !imgUrl.startsWith('data:')
            };
        });

        let stores = shopOwners.map((u, i) => {
            const isClosed = u.storeStatus === 'closed';
            const storeLoc = u.location || '';
            const fullAddr = u.storeAddress || u.address || storeLoc || 'Colombo, Sri Lanka';
            return {
                id: u._id.toString(),
                name: u.shopName || (u.name ? `${u.name}'s Store` : 'Fresh Grocery Store'),
                email: u.email || '',
                storeEmail: u.email || '',
                ownerEmail: u.email || '',
                ownerName: u.name || 'Shop Owner',
                address: fullAddr,
                storeAddress: u.storeAddress || '',
                location: storeLoc,
                picture: u.picture || '',
                distance: `${(1.0 + (i % 5) * 0.4).toFixed(1)} km`,
                rating: u.rating || '4.9 ★',
                status: isClosed ? 'Closed' : 'Open • Pick up in 30m',
                storeStatus: u.storeStatus || 'open'
            };
        });

        const defaultBanner = {
            badge: '🔥 20% OFF DEALS',
            title: 'Fresh Harvest Deals',
            subtitle: 'Pick up in 15 mins at nearest grocery store',
            btnText: 'Shop Now',
            active: true,
            bannerBg: '/banner_bg.png',
            storeName: 'GroceryMart'
        };

        customerHomeCache = {
            success: true,
            featuredProducts,
            stores,
            topCategories: [],
            activeOrder: null,
            activeBanner: defaultBanner,
            allBanners: [defaultBanner]
        };
        customerHomeCacheTime = Date.now();
        storesCache = stores;
        storesCacheTime = Date.now();
        console.log('⚡ [PERFORMANCE] Customer Shopping RAM Cache pre-warmed with', featuredProducts.length, 'featured products &', stores.length, 'stores!');
    } catch (e) {
        console.warn('Customer shopping cache prewarm skipped:', e.message);
    }
};
setTimeout(prewarmCustomerShoppingCache, 1200);

// 3. GET Product Details
exports.getProductDetails = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        res.json({ success: true, product });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Helper to generate guaranteed collision-free order numbers
const generateUniqueOrderNumber = async () => {
    try {
        const allOrders = await Order.find({}, { orderNumber: 1 }).lean();
        const existingNumbers = new Set(allOrders.map(o => (o.orderNumber || '').trim()));

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

// 4. CHECKOUT & Create Pre-Order (Cart & Pickup Selection)
exports.createCheckoutOrder = async (req, res) => {
    try {
        const { items, totalAmount, pickupStore, pickupDate, pickupTimeSlot, smartReplacementOptIn } = req.body;
        const qrToken = `QR-LOCKER-${Math.floor(1000 + Math.random() * 9000)}`;

        const orderData = {
            customer: req.user ? req.user._id : null,
            customerName: req.user ? req.user.name : 'Guest Customer',
            customerPhone: req.user ? req.user.phone : '0770000000',
            items,
            totalAmount,
            pickupStore: pickupStore || 'Green Basket Grocery - Colombo 03',
            pickupDate: pickupDate || 'Today',
            pickupTimeSlot: pickupTimeSlot || '5:30 PM - 6:00 PM',
            qrToken,
            smartReplacementOptIn: smartReplacementOptIn !== undefined ? smartReplacementOptIn : true
        };

        let newOrder = null;
        let attempts = 0;
        let lastError = null;

        while (attempts < 5 && !newOrder) {
            try {
                const orderNumber = await generateUniqueOrderNumber();
                orderData.orderNumber = orderNumber;
                newOrder = await Order.create(orderData);
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

        if (!newOrder) {
            throw lastError || new Error('Failed to create order due to duplicate key.');
        }

        res.status(201).json({
            success: true,
            message: 'Pre-order placed successfully!',
            order: newOrder
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 5. GET Smart Replacement Suggestions
exports.getSmartReplacements = async (req, res) => {
    try {
        const replacements = [
            {
                originalItem: 'Organic Nuwara Eliya Carrots',
                suggestedItem: 'Organic Dambulla Sweet Carrots',
                priceDifference: 0,
                reason: 'Dambulla harvest today is crisper with 5-star rating.',
                status: 'Free Upgrade'
            }
        ];
        res.json({ success: true, replacements });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 6. GET Order Confirmation & Live QR Token
exports.getOrderConfirmation = async (req, res) => {
    try {
        const order = await Order.findOne({ orderNumber: req.params.orderNumber });
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        res.json({ success: true, order });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 7. GET Customer Profile & Pickup History
exports.getCustomerProfile = async (req, res) => {
    try {
        const user = req.user;
        const recentOrders = req.user ? await Order.find({ customer: req.user._id }).sort({ createdAt: -1 }).limit(5) : [];
        res.json({
            success: true,
            user,
            recentOrders
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
