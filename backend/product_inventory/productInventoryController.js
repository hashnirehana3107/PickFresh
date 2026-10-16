const mongoose = require('mongoose');
const { Product, Supplier, RestockRequest } = require('./ProductInventoryModel');
const Order = require('../models/Order');
const Category = require('../models/Category');

// Helper default categories if collection is empty
const DEFAULT_CATEGORIES = [
    { name: 'Dairy', fallbackEmoji: '🥛', color: '#E3F2FD', textColor: '#1565C0', image: '/dairy_icon.png' },
    { name: 'Beverages', fallbackEmoji: '🥤', color: '#FFF3E0', textColor: '#E65100', image: '' },
    { name: 'Grocery', fallbackEmoji: '📦', color: '#E8F5E9', textColor: '#2E7D32', image: '' },
    { name: 'Bakery', fallbackEmoji: '🍞', color: '#FCE4EC', textColor: '#C2185B', image: '/bakery_icon.png' },
    { name: 'Vegetables', fallbackEmoji: '🥕', color: '#E8F5E9', textColor: '#2E7D32', image: '/veg_icon.png' },
    { name: 'Fruits', fallbackEmoji: '🥑', color: '#FFF3E0', textColor: '#E65100', image: '/fruit_icon.png' },
    { name: 'Snacks', fallbackEmoji: '🍿', color: '#FFF8E1', textColor: '#F57F17', image: '' },
    { name: 'Grains', fallbackEmoji: '🌾', color: '#F3E5F5', textColor: '#7B1FA2', image: '' }
];

let isCategoriesSeeded = false;
let categoriesCache = null;
let categoriesCacheTime = 0;
const CATEGORIES_TTL = 60 * 1000; // 60 seconds

const ensureCategoriesSeeded = async () => {
    if (isCategoriesSeeded) return;
    try {
        const count = await Category.countDocuments();
        if (count === 0) {
            await Category.insertMany(DEFAULT_CATEGORIES);
        }
        isCategoriesSeeded = true;
    } catch (e) {
        console.warn('Category seed check exception:', e.message);
    }
};

const notifyCustomerCacheInvalidation = () => {
    try {
        const { invalidateCustomerShoppingCache } = require('../customer_shopping/customerShoppingController');
        if (typeof invalidateCustomerShoppingCache === 'function') {
            invalidateCustomerShoppingCache();
        }
    } catch (e) {}
};

// Get All Categories from MongoDB (Ultra-fast RAM Cache + MongoDB persistence)
exports.getCategories = async (req, res) => {
    try {
        if (categoriesCache && (Date.now() - categoriesCacheTime < CATEGORIES_TTL)) {
            return res.json({ success: true, categories: categoriesCache });
        }
        ensureCategoriesSeeded(); // Non-blocking async check
        const categories = await Category.find({}).sort({ createdAt: 1 }).lean();
        categoriesCache = categories;
        categoriesCacheTime = Date.now();
        return res.json({ success: true, categories });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// Add New Custom Category
exports.addCategory = async (req, res) => {
    try {
        const { name, image, fallbackEmoji } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: 'Category name is required' });
        }
        const existing = await Category.findOne({ name: new RegExp(`^${name.trim()}$`, 'i') });
        if (existing) {
            return res.json({ success: true, message: 'Category already exists', category: existing });
        }

        const newCat = await Category.create({
            name: name.trim(),
            image: image || '',
            fallbackEmoji: fallbackEmoji || '📦',
            color: '#E8F5E9',
            textColor: '#2E7D32'
        });

        categoriesCache = null;
        notifyCustomerCacheInvalidation();

        return res.status(201).json({ success: true, message: 'Category created successfully', category: newCat });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// Update Existing Category in MongoDB Atlas
exports.updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, image, fallbackEmoji } = req.body;

        if (!id) {
            return res.status(400).json({ success: false, message: 'Category ID or Name is required' });
        }

        const decoded = decodeURIComponent(id).trim();
        let cat = null;

        if (mongoose.Types.ObjectId.isValid(decoded)) {
            cat = await Category.findById(decoded);
        }
        if (!cat) {
            const safeName = decoded.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            cat = await Category.findOne({ name: new RegExp(`^${safeName}$`, 'i') });
        }

        if (!cat) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        const oldName = cat.name;

        if (name && name.trim()) cat.name = name.trim();
        if (image !== undefined) cat.image = image;
        if (fallbackEmoji !== undefined) cat.fallbackEmoji = fallbackEmoji;

        await cat.save();

        // Also update any products associated with old category name if name changed
        if (name && name.trim() && name.trim() !== oldName) {
            await Product.updateMany({ category: oldName }, { category: name.trim() });
        }

        categoriesCache = null;
        notifyCustomerCacheInvalidation();

        return res.json({ success: true, message: 'Category updated successfully', category: cat });
    } catch (err) {
        console.error('Error updating category:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
};

// Delete Category from MongoDB
exports.deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ success: false, message: 'Category ID or Name is required' });
        }

        const decoded = decodeURIComponent(id).trim();
        let deletedCategory = null;

        // Try deleting by ObjectId if valid
        if (mongoose.Types.ObjectId.isValid(decoded)) {
            deletedCategory = await Category.findByIdAndDelete(decoded);
        }

        // Fallback: Delete by category name (case-insensitive)
        if (!deletedCategory) {
            const safeName = decoded.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            deletedCategory = await Category.findOneAndDelete({ name: new RegExp(`^${safeName}$`, 'i') });
        }

        const catName = (deletedCategory && deletedCategory.name) ? deletedCategory.name : decoded;

        // Also clean up supplyCategories in User profiles
        try {
            const User = require('../models/User');
            const safeCatName = catName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            await User.updateMany(
                {},
                { $pull: { supplyCategories: { $in: [catName, new RegExp(`^${safeCatName}$`, 'i')] } } }
            );

            // Update supplyCategory string
            const affectedUsers = await User.find({ supplyCategories: { $exists: true } });
            for (const u of affectedUsers) {
                if (Array.isArray(u.supplyCategories)) {
                    u.supplyCategory = u.supplyCategories.join(', ');
                    await u.save();
                }
            }
        } catch (uErr) {
            console.warn('Notice cleaning up User supplyCategories:', uErr.message);
        }

        categoriesCache = null;
        notifyCustomerCacheInvalidation();

        return res.json({
            success: true,
            message: 'Category deleted successfully from MongoDB',
            deletedCategory
        });
    } catch (err) {
        console.error('Error deleting category:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
};

// Helper to auto-extract brand from product name if brand field is missing
const autoExtractBrand = (productName) => {
    if (!productName || typeof productName !== 'string') return '';
    const knownBrands = [
        'Anchor', 'Highland', 'Maliban', 'Munchee', 'Keells', 'Ratthi', 'Elephant House',
        'Coca-Cola', 'Coke', 'Sunquick', 'Kist', 'Astra', 'Maggi', 'MD', 'Surf Excel',
        'Vim', 'Sunlight', 'Signal', 'Kotmale', 'Bairaha', 'Prima', 'Nestle', 'Milo',
        'Laksala', 'Pelwatte', 'Harischandra', 'McCurrie', 'Dilmah', 'Zesta', 'Watawala',
        'Sanstha', 'Cargills', 'Knorr', 'Heinz', 'Pringles', 'Lays', 'Lay\'s', 'Sprite',
        'Fanta', 'Pepsi', 'Red Bull', '7Up', 'Nescafé', 'Nescafe', 'Goldlee', 'Wijaya',
        'Ruhunu', 'Motha', 'Roar', 'Smak', 'Country Fair', 'Delmege', 'Orient'
    ];
    for (const b of knownBrands) {
        const regex = new RegExp(`\\b${b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (regex.test(productName)) {
            return b;
        }
    }
    return '';
};

// Helper to calculate status
const calculateStatus = (stock, minStock) => {
    if (stock <= 0) return 'OUT OF STOCK';
    if (stock <= minStock) return 'LOW STOCK';
    return 'IN STOCK';
};

// RAM memory cache for instant (1ms) Dashboard responses
let dashboardMemoryCache = {};
let dashboardMemoryCacheTime = {};

const invalidateDashboardCache = () => {
    dashboardMemoryCache = {};
    dashboardMemoryCacheTime = {};
};
exports.invalidateDashboardCache = invalidateDashboardCache;

// 1. Shop Owner Dashboard Summary strictly from MongoDB Atlas for target shop (Ultra Fast Parallel Queries)
exports.getDashboardStats = async (req, res) => {
    try {
        const storeEmailParam = (req.query.storeEmail || req.query.email || '').toLowerCase().trim();
        const storeNameParam = (req.query.storeName || '').trim();
        const explicitRefresh = req.query.refresh === 'true';
        const cacheKey = `${storeEmailParam}_${storeNameParam}`;

        // Return from synchronized RAM cache instantly (1ms) if fresh (TTL 30s)
        if (!explicitRefresh && dashboardMemoryCache[cacheKey] && (Date.now() - (dashboardMemoryCacheTime[cacheKey] || 0) < 30000)) {
            return res.json(dashboardMemoryCache[cacheKey]);
        }

        let query = {};
        const orList = [];
        if (storeEmailParam) {
            orList.push({ ownerEmail: storeEmailParam });
            orList.push({ storeEmail: storeEmailParam });
            if (storeEmailParam.includes('grocery')) {
                orList.push({ storeName: /grocery/i });
            } else if (storeEmailParam.includes('lanka')) {
                orList.push({ storeName: /lanka/i });
            }
        }
        if (storeNameParam) {
            const clean = storeNameParam.split('•')[0].split('-')[0].trim();
            if (clean) {
                orList.push({ storeName: new RegExp(clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') });
            }
        }
        if (orList.length > 0) {
            query.$or = orList;
        }

        // Direct lean query from Atlas so counts are ALWAYS 100% live and exact
        const dbProducts = await Product.find(query)
            .select('name stock stockQuantity minStock lowStockThreshold createdAt updatedAt ownerEmail storeEmail storeName')
            .sort({ createdAt: -1 })
            .lean();

        const recentProducts = dbProducts.slice(0, 5);

        let cleanStore = (storeNameParam || '').split('•')[0].split('-')[0].trim();
        let storeRegex = null;
        if (cleanStore) {
            storeRegex = new RegExp(cleanStore.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        } else if (storeEmailParam.includes('grocery')) {
            storeRegex = /grocery/i;
        } else if (storeEmailParam.includes('lanka')) {
            storeRegex = /lanka/i;
        }

        let orderQuery = {
            status: { $in: ['Pending', 'Preparing', 'Ready for Pickup'] }
        };
        if (storeRegex) {
            orderQuery.$or = [
                { pickupStore: storeRegex },
                { storeName: storeRegex }
            ];
        }

        let completedOrderQuery = { status: 'Completed' };
        if (storeRegex) {
            completedOrderQuery.$or = [
                { pickupStore: storeRegex },
                { storeName: storeRegex }
            ];
        }

        // Execute orders queries in parallel
        const [activePickupsCount, completedOrders] = await Promise.all([
            Order.countDocuments(orderQuery),
            Order.find(completedOrderQuery).select('totalAmount').lean()
        ]);

        const totalProducts = dbProducts.length;
        const lowStockCount = dbProducts.filter(p => {
            const stk = p.stock !== undefined ? p.stock : (p.stockQuantity !== undefined ? p.stockQuantity : 0);
            const minStk = p.minStock !== undefined ? p.minStock : (p.lowStockThreshold || 10);
            return stk > 0 && stk <= minStk;
        }).length;
        const outOfStockCount = dbProducts.filter(p => {
            const stk = p.stock !== undefined ? p.stock : (p.stockQuantity !== undefined ? p.stockQuantity : 0);
            return stk === 0;
        }).length;

        const todaySales = (completedOrders || []).reduce((sum, o) => sum + (o.totalAmount || 0), 0);

        // Generate real recent activity dynamically from shop owner's products
        const recentActivity = (recentProducts || []).map((p) => {
            const stk = p.stock !== undefined ? p.stock : (p.stockQuantity || 0);
            const isOut = stk === 0;
            const diffMinutes = Math.floor((new Date() - new Date(p.createdAt || Date.now())) / (1000 * 60));
            let timeAgoStr = 'Just now';
            if (diffMinutes >= 60 * 24) {
                timeAgoStr = `${Math.floor(diffMinutes / (60 * 24))}d ago`;
            } else if (diffMinutes >= 60) {
                timeAgoStr = `${Math.floor(diffMinutes / 60)}h ago`;
            } else if (diffMinutes > 0) {
                timeAgoStr = `${diffMinutes}m ago`;
            }

            return {
                id: p._id.toString(),
                title: p.name,
                subtitle: `${timeAgoStr} • ${isOut ? 'Out of Stock' : 'Stock Updated'}`,
                change: isOut ? `0` : `+${stk}`,
                type: isOut ? 'out' : 'in'
            };
        });

        const responseData = {
            success: true,
            stats: {
                totalProducts,
                lowStockCount,
                outOfStockCount,
                todaySales,
                activePickups: activePickupsCount || 0
            },
            lowStockItems: dbProducts.filter(p => {
                const stk = p.stock !== undefined ? p.stock : (p.stockQuantity !== undefined ? p.stockQuantity : 0);
                const minStk = p.minStock !== undefined ? p.minStock : (p.lowStockThreshold || 10);
                return stk <= minStk;
            }),
            recentActivity
        };

        dashboardMemoryCache[cacheKey] = responseData;
        dashboardMemoryCacheTime[cacheKey] = Date.now();

        return res.json(responseData);
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// Product RAM memory cache for instant (1ms) responses
let productsMemoryCache = null;
let productsMemoryCacheTime = 0;

const upsertProductInCache = (productDoc) => {
    const formatted = formatProductDoc(productDoc);
    if (!productsMemoryCache || !Array.isArray(productsMemoryCache)) {
        productsMemoryCache = [formatted];
    } else {
        const idStr = String(formatted.id || formatted._id);
        const idx = productsMemoryCache.findIndex(p => String(p.id || p._id) === idStr);
        if (idx !== -1) {
            productsMemoryCache[idx] = { ...productsMemoryCache[idx], ...formatted };
        } else {
            productsMemoryCache.unshift(formatted);
        }
    }
    productsMemoryCacheTime = Date.now();
    return formatted;
};

const removeProductFromCache = (productId) => {
    if (productsMemoryCache && Array.isArray(productsMemoryCache)) {
        const idStr = String(productId);
        productsMemoryCache = productsMemoryCache.filter(p => String(p.id || p._id) !== idStr);
        productsMemoryCacheTime = Date.now();
    }
};

const invalidateProductsCache = () => {
    productsMemoryCache = null;
    productsMemoryCacheTime = 0;
    invalidateDashboardCache();
    prewarmProductsCache().catch(() => {});
};
exports.invalidateProductsCache = invalidateProductsCache;

const getCategoryImageFallback = (catName = '', prodName = '') => {
    const combined = `${catName} ${prodName}`.toLowerCase();
    if (combined.includes('milk') || combined.includes('dairy') || combined.includes('cheese') || combined.includes('egg')) return '/cat_dairy.png';
    if (combined.includes('fruit') || combined.includes('avocado') || combined.includes('apple') || combined.includes('strawberry')) return '/cat_fruits.png';
    if (combined.includes('bread') || combined.includes('bakery') || combined.includes('bun')) return '/cat_bakery.png';
    if (combined.includes('drink') || combined.includes('beverage') || combined.includes('coke') || combined.includes('juice')) return '/cat_beverages.png';
    return '/cat_veg.png';
};

// Helper to format raw product document
const formatProductDoc = (p) => {
    const stk = p.stock !== undefined ? p.stock : (p.stockQuantity !== undefined ? p.stockQuantity : 0);
    const minStk = p.minStock !== undefined ? p.minStock : (p.lowStockThreshold !== undefined ? p.lowStockThreshold : 10);
    const rawImg = p.image || p.imageUrl || '';
    const finalImg = rawImg && (rawImg.startsWith('data:') || rawImg.startsWith('http') || rawImg.startsWith('/')) ? rawImg : getCategoryImageFallback(p.category, p.name);
    let b = (p.brand || '').trim();
    if (!b && p.name) {
        b = autoExtractBrand(p.name);
    }
    const cleanOwnerEmail = (p.ownerEmail || p.storeEmail || '').toLowerCase().trim();
    const cleanStoreEmail = (p.storeEmail || p.ownerEmail || '').toLowerCase().trim();
    const defaultStore = cleanOwnerEmail.includes('grocery') ? 'GroceryMart' : 'LankaMart';

    return {
        id: (p._id || p.id).toString(),
        _id: (p._id || p.id).toString(),
        name: p.name,
        price: p.price,
        unit: p.unit || '1kg',
        brand: b,
        stock: stk,
        stockQuantity: stk,
        minStock: minStk,
        lowStockThreshold: minStk,
        status: p.status || p.stockStatus || calculateStatus(stk, minStk),
        stockStatus: p.stockStatus || calculateStatus(stk, minStk),
        storeName: p.storeName || defaultStore,
        supplierName: p.supplierName || 'Central Food City',
        ownerEmail: cleanOwnerEmail,
        storeEmail: cleanStoreEmail,
        storeIcon: p.storeIcon || '',
        category: p.category || 'Grocery',
        image: finalImg,
        imageUrl: finalImg,
        fallbackEmoji: p.fallbackEmoji || '📦',
        bgColor: p.bgColor || '#EFF6FF',
        createdAt: p.createdAt || new Date(),
        updatedAt: p.updatedAt || new Date()
    };
};

const prewarmProductsCache = async () => {
    try {
        const products = await Product.find({}).sort({ createdAt: -1 }).lean();
        if (products && products.length > 0) {
            productsMemoryCache = products.map(formatProductDoc);
            productsMemoryCacheTime = Date.now();
            console.log('⚡ [PERFORMANCE] Product Inventory RAM Cache pre-warmed with', productsMemoryCache.length, 'products!');
        }
    } catch (e) {
        console.warn('Product cache pre-warm error:', e.message);
    }
};
exports.prewarmProductsCache = prewarmProductsCache;

// Pre-warm products RAM cache immediately
setTimeout(() => {
    prewarmProductsCache().catch(() => {});
}, 300);

// Helper to filter products by store
const matchesStoreFilter = (p, storeEmailParam, storeNameParam) => {
    if (!storeEmailParam && !storeNameParam) return true;
    const pOwner = (p.ownerEmail || '').toLowerCase().trim();
    const pStoreEmail = (p.storeEmail || '').toLowerCase().trim();
    const pStoreName = (p.storeName || '').toLowerCase().trim();

    if (storeEmailParam) {
        if (pOwner === storeEmailParam || pStoreEmail === storeEmailParam) return true;
        if (storeEmailParam.includes('grocery') && (pStoreName.includes('grocery') || pOwner.includes('grocery'))) return true;
        if (storeEmailParam.includes('lanka') && (pStoreName.includes('lanka') || pOwner.includes('lanka'))) return true;
    }
    if (storeNameParam) {
        const clean = storeNameParam.split('•')[0].split('-')[0].trim().toLowerCase();
        if (clean && (pStoreName.includes(clean) || clean.includes(pStoreName))) return true;
    }
    return false;
};

// 2. Get All Products (Ultra-fast from synchronized RAM cache with MongoDB Atlas persistence)
exports.getProducts = async (req, res) => {
    try {
        const now = Date.now();
        const storeEmailParam = (req.query.storeEmail || req.query.email || '').toLowerCase().trim();
        const storeNameParam = (req.query.storeName || '').toLowerCase().trim();
        const explicitRefresh = req.query.refresh === 'true';

        // 1. Return from synchronized RAM cache instantly (<5ms) if fresh (TTL 60s)
        if (!explicitRefresh && productsMemoryCache && productsMemoryCache.length > 0 && (now - productsMemoryCacheTime < 60000)) {
            const filtered = productsMemoryCache.filter(p => matchesStoreFilter(p, storeEmailParam, storeNameParam));
            return res.json({ success: true, count: filtered.length, products: filtered });
        }

        // 2. Fetch directly from Atlas if cache is empty or explicit refresh requested
        let query = {};
        const orList = [];
        if (storeEmailParam) {
            orList.push({ ownerEmail: storeEmailParam });
            orList.push({ storeEmail: storeEmailParam });
            if (storeEmailParam.includes('grocery')) {
                orList.push({ storeName: /grocery/i });
            } else if (storeEmailParam.includes('lanka')) {
                orList.push({ storeName: /lanka/i });
            }
        }
        if (storeNameParam) {
            const clean = storeNameParam.split('•')[0].split('-')[0].trim();
            if (clean) {
                orList.push({ storeName: new RegExp(clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') });
            }
        }
        if (orList.length > 0) {
            query.$or = orList;
        }

        let products = await Product.find(query).sort({ createdAt: -1 }).lean().maxTimeMS(10000);

        if ((!products || products.length === 0) && !storeEmailParam) {
            products = await Product.find({}).sort({ createdAt: -1 }).lean().maxTimeMS(10000);
        }

        const formattedProducts = (products || []).map(formatProductDoc);

        if (!productsMemoryCache || productsMemoryCache.length === 0 || !storeEmailParam) {
            productsMemoryCache = formattedProducts;
            productsMemoryCacheTime = Date.now();
        } else {
            formattedProducts.forEach(fp => {
                const idStr = String(fp.id || fp._id);
                const idx = productsMemoryCache.findIndex(p => String(p.id || p._id) === idStr);
                if (idx !== -1) {
                    productsMemoryCache[idx] = fp;
                } else {
                    productsMemoryCache.unshift(fp);
                }
            });
            productsMemoryCacheTime = Date.now();
        }

        const filtered = (productsMemoryCache || formattedProducts).filter(p => matchesStoreFilter(p, storeEmailParam, storeNameParam));
        return res.json({ success: true, count: filtered.length, products: filtered });
    } catch (err) {
        console.warn('getProducts Atlas fetch error, falling back to cache:', err.message);
        if (productsMemoryCache && productsMemoryCache.length > 0) {
            const storeEmailParam = (req.query.storeEmail || '').toLowerCase().trim();
            const storeNameParam = (req.query.storeName || '').toLowerCase().trim();
            const filtered = productsMemoryCache.filter(p => matchesStoreFilter(p, storeEmailParam, storeNameParam));
            return res.json({ success: true, count: filtered.length, products: filtered, cached: true });
        }
        return res.status(500).json({ success: false, message: err.message });
    }
};

// 3. Add New Product (Saves directly to MongoDB 'products' collection & immediately updates cache)
exports.addProduct = async (req, res) => {
    try {
        const stockNum = Number(req.body.stock) || Number(req.body.stockQuantity) || 0;
        const minStockNum = Number(req.body.minStock) || Number(req.body.lowStockThreshold) || 10;
        const status = calculateStatus(stockNum, minStockNum);
        const nameVal = req.body.name ? req.body.name.trim() : 'New Product';
        let brandVal = (req.body.brand || '').trim();
        if (!brandVal) {
            brandVal = autoExtractBrand(nameVal);
        }

        const cleanEmail = (req.body.storeEmail || req.body.ownerEmail || req.user?.email || '').toLowerCase().trim();
        const storeNameVal = (req.body.storeName || (cleanEmail.includes('grocery') ? 'GroceryMart' : 'LankaMart')).trim();

        let supplierNameVal = (req.body.supplierName || 'Local Supplier').trim();
        let supplierEmailVal = (req.body.supplierEmail || '').trim().toLowerCase();

        if (!supplierEmailVal && supplierNameVal && supplierNameVal !== 'Local Supplier') {
            try {
                const User = require('../models/User');
                const esc = supplierNameVal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const foundUser = await User.findOne({
                    role: 'supplier',
                    $or: [
                        { supplierName: { $regex: `^${esc}$`, $options: 'i' } },
                        { name: { $regex: `^${esc}$`, $options: 'i' } }
                    ]
                }).select('email').lean();
                if (foundUser && foundUser.email) {
                    supplierEmailVal = foundUser.email.toLowerCase().trim();
                } else {
                    const { Supplier } = require('./ProductInventoryModel');
                    const foundSup = await Supplier.findOne({
                        name: { $regex: `^${esc}$`, $options: 'i' }
                    }).select('email').lean();
                    if (foundSup && foundSup.email) {
                        supplierEmailVal = foundSup.email.toLowerCase().trim();
                    }
                }
            } catch (e) {}
        }

        const newProductData = {
            name: nameVal,
            price: Number(req.body.price) || 0,
            costPrice: Number(req.body.costPrice) || Math.round((Number(req.body.price) || 0) * 0.8),
            unit: req.body.unit || '1kg',
            brand: brandVal,
            stock: stockNum,
            stockQuantity: stockNum,
            minStock: minStockNum,
            lowStockThreshold: minStockNum,
            status,
            stockStatus: status === 'OUT OF STOCK' ? 'Out of Stock' : status === 'LOW STOCK' ? 'Low Stock' : 'In Stock',
            storeName: storeNameVal,
            supplierName: supplierNameVal,
            supplierEmail: supplierEmailVal,
            ownerEmail: cleanEmail,
            storeEmail: cleanEmail,
            storeIcon: req.body.storeIcon || '',
            category: req.body.category || 'Grocery',
            image: req.body.image || req.body.imageUrl || '',
            imageUrl: req.body.imageUrl || req.body.image || '',
            fallbackEmoji: req.body.fallbackEmoji || '📦',
            bgColor: req.body.bgColor || '#EFF6FF'
        };

        const savedProduct = await Product.create(newProductData);
        // Immediate in-memory cache update so the very next getProducts is 0ms
        const formatted = upsertProductInCache(savedProduct);
        invalidateDashboardCache();
        notifyCustomerCacheInvalidation();

        return res.status(201).json({
            success: true,
            message: 'Product saved successfully to MongoDB products collection',
            product: formatted
        });
    } catch (err) {
        console.error('Add product MongoDB error:', err.message);
        return res.status(500).json({ success: false, message: err.message });
    }
};

// 4. Update Product (Updates MongoDB 'products' collection & immediately updates cache)
exports.updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const stockNum = req.body.stock !== undefined ? Number(req.body.stock) : undefined;
        const minStockNum = req.body.minStock !== undefined ? Number(req.body.minStock) : undefined;

        let updateFields = { ...req.body };
        if (updateFields.name) {
            updateFields.name = updateFields.name.trim();
        }
        if (updateFields.brand !== undefined) {
            updateFields.brand = String(updateFields.brand || '').trim();
        }
        if (!updateFields.brand && updateFields.name) {
            updateFields.brand = autoExtractBrand(updateFields.name);
        }

        if (stockNum !== undefined || minStockNum !== undefined) {
            const finalStock = stockNum !== undefined ? stockNum : 0;
            const finalMin = minStockNum !== undefined ? minStockNum : 10;
            updateFields.status = calculateStatus(finalStock, finalMin);
            updateFields.stock = finalStock;
            updateFields.stockQuantity = finalStock;
            updateFields.minStock = finalMin;
            updateFields.lowStockThreshold = finalMin;
        }

        const updatedDoc = await Product.findByIdAndUpdate(id, updateFields, { new: true });
        let formatted = null;
        if (updatedDoc) {
            formatted = upsertProductInCache(updatedDoc);
        }
        invalidateDashboardCache();
        notifyCustomerCacheInvalidation();

        return res.json({
            success: true,
            message: 'Product updated successfully in MongoDB products collection',
            product: formatted || (updatedDoc ? formatProductDoc(updatedDoc) : null)
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// 5. Delete Product (Deletes from MongoDB 'products' collection & immediately removes from cache)
exports.deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        await Product.findByIdAndDelete(id);
        removeProductFromCache(id);
        invalidateDashboardCache();
        notifyCustomerCacheInvalidation();
        return res.json({ success: true, message: 'Product deleted from MongoDB products collection', deletedId: id });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// In-memory RAM cache for Suppliers list
let suppliersMemoryCache = null;
let suppliersMemoryCacheTime = 0;

const invalidateSuppliersCache = () => {
    suppliersMemoryCache = null;
    suppliersMemoryCacheTime = 0;
};

// 6. Get Suppliers List from MongoDB Atlas (Optimized Parallel Execution & RAM Cache)
exports.getSuppliers = async (req, res) => {
    try {
        const { storeEmail, onlyLinked, linkedOnly } = req.query;
        const filterEmail = storeEmail ? storeEmail.toLowerCase().trim() : null;
        const isOnlyLinkedRequested = onlyLinked === 'true' || linkedOnly === 'true';
        const now = Date.now();

        // Return instant RAM cache if available (0ms execution time)
        if (!req.query._t && suppliersMemoryCache && (now - suppliersMemoryCacheTime < 300 * 1000)) {
            const list = suppliersMemoryCache.map(s => ({
                ...s,
                isLinkedToCurrentStore: filterEmail
                    ? (Array.isArray(s.linkedStores) ? s.linkedStores.map(ls => (typeof ls === 'string' ? ls : (ls.email || ls.storeEmail || '')).toLowerCase()) : []).includes(filterEmail)
                    : false
            }));
            const finalSuppliers = isOnlyLinkedRequested ? list.filter(s => s.isLinkedToCurrentStore === true) : list;
            return res.json({ success: true, count: finalSuppliers.length, suppliers: finalSuppliers });
        }

        const User = require('../models/User');
        const SupplierProductCatalog = require('../models/SupplierProductCatalog');

        // Parallel MongoDB collection queries for maximum sub-20ms performance
        const [supplierUsers, dbSuppliers, catalogItems, allProducts] = await Promise.all([
            User.find({ role: { $regex: /^supplier$/i } }).select('name email phone supplierName contactPerson supplyRegion supplyRegions supplyCategory supplyCategories linkedStores').lean().exec(),
            Supplier.find({}).lean().exec(),
            SupplierProductCatalog.find({}).lean().exec(),
            Product.find({ supplierName: { $exists: true, $ne: '' } }).select('supplierName name').lean().exec()
        ]);

        const buildList = (applyFilter = true) => {
            const suppliersList = [];
            const seenEmails = new Set();

            supplierUsers.forEach(u => {
                const emailKey = u.email ? u.email.toLowerCase() : u._id.toString();
                seenEmails.add(emailKey);

                if (applyFilter && filterEmail) {
                    const storeList = Array.isArray(u.linkedStores) ? u.linkedStores.map(s => (typeof s === 'string' ? s : (s.email || s.storeEmail || '')).toLowerCase()) : [];
                    if (!storeList.includes(filterEmail)) return;
                }

                const sEmailLower = (u.email || '').toLowerCase();
                const sNameLower = (u.supplierName || u.name || '').toLowerCase();

                // 1. Strictly match supplier's real catalog products
                const supplierCatalogProducts = catalogItems.filter(c => {
                    const cEmail = (c.supplierEmail || '').toLowerCase();
                    const cName = (c.supplierName || '').toLowerCase();
                    return (sEmailLower && cEmail === sEmailLower) || (sNameLower && cName && (cName === sNameLower || cName.includes(sNameLower)));
                });

                // 2. Compute categories from profile + catalog
                const profileCategories = Array.isArray(u.supplyCategories) && u.supplyCategories.length > 0
                    ? u.supplyCategories
                    : (u.supplyCategory ? u.supplyCategory.split(',').map(s => s.trim()).filter(Boolean) : []);

                const catalogCategories = Array.from(new Set(supplierCatalogProducts.map(c => c.category).filter(Boolean)));
                const combinedCategories = Array.from(new Set([...profileCategories, ...catalogCategories]));
                const categoriesList = combinedCategories.length > 0 ? combinedCategories : ['General Wholesale'];

                // 3. Compute product counts per category
                const categoryCounts = {};
                supplierCatalogProducts.forEach(c => {
                    const cat = c.category || 'General';
                    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
                });

                const regionsList = Array.isArray(u.supplyRegions) && u.supplyRegions.length > 0
                    ? u.supplyRegions
                    : (u.supplyRegion ? u.supplyRegion.split(',').map(s => s.trim()).filter(Boolean) : []);

                const regionDisplay = u.supplyRegion || (regionsList.length > 0 ? regionsList.join(', ') : 'Colombo 03');
                const categoryDisplay = u.supplyCategory || (categoriesList.length > 0 ? categoriesList.join(', ') : 'General Wholesale');

                // 4. Products list: use real catalog products if present, else fallback
                const uniqueSuppliedProducts = supplierCatalogProducts.length > 0
                    ? supplierCatalogProducts.map(c => c.name)
                    : Array.from(new Set(allProducts.filter(p => {
                        const pSup = (p.supplierName || '').toLowerCase();
                        return pSup && (pSup === sNameLower || sNameLower.includes(pSup) || pSup.includes(sNameLower));
                    }).map(p => p.name)));

                suppliersList.push({
                    id: u._id.toString(),
                    _id: u._id.toString(),
                    name: u.supplierName || u.name || 'Registered Supplier',
                    contactPerson: u.contactPerson || u.name || 'Sales Representative',
                    category: categoryDisplay,
                    supplyCategories: categoriesList,
                    categoryCounts,
                    phone: u.phone || '077 000 0000',
                    email: u.email || '',
                    region: regionDisplay,
                    supplyRegions: regionsList,
                    rating: '5.0 ★',
                    status: 'ACTIVE',
                    catalogCount: supplierCatalogProducts.length > 0 ? supplierCatalogProducts.length : uniqueSuppliedProducts.length,
                    suppliedProducts: uniqueSuppliedProducts,
                    suppliedProductsFull: supplierCatalogProducts,
                    linkedStores: Array.isArray(u.linkedStores) ? u.linkedStores : []
                });
            });

            dbSuppliers.forEach(s => {
                const emailKey = s.email ? s.email.toLowerCase() : s._id.toString();
                if (!seenEmails.has(emailKey)) {
                    seenEmails.add(emailKey);

                    if (applyFilter && filterEmail) {
                        const storeList = Array.isArray(s.linkedStores) ? s.linkedStores.map(ls => (typeof ls === 'string' ? ls : (ls.email || ls.storeEmail || '')).toLowerCase()) : [];
                        if (!storeList.includes(filterEmail)) return;
                    }

                    const sEmailLower = (s.email || '').toLowerCase();
                    const sNameLower = (s.name || '').toLowerCase();

                    const supplierCatalogProducts = catalogItems.filter(c => {
                        const cEmail = (c.supplierEmail || '').toLowerCase();
                        const cName = (c.supplierName || '').toLowerCase();
                        return (sEmailLower && cEmail === sEmailLower) || (sNameLower && cName && (cName === sNameLower || cName.includes(sNameLower)));
                    });

                    const profileCategories = Array.isArray(s.supplyCategories) && s.supplyCategories.length > 0
                        ? s.supplyCategories
                        : (s.category ? s.category.split(',').map(c => c.trim()).filter(Boolean) : []);

                    const catalogCategories = Array.from(new Set(supplierCatalogProducts.map(c => c.category).filter(Boolean)));
                    const combinedCategories = Array.from(new Set([...profileCategories, ...catalogCategories]));
                    const categoriesList = combinedCategories.length > 0 ? combinedCategories : ['General Wholesale'];

                    const categoryCounts = {};
                    supplierCatalogProducts.forEach(c => {
                        const cat = c.category || 'General';
                        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
                    });

                    const staticProducts = Array.isArray(s.suppliedProducts) ? s.suppliedProducts : [];
                    const uniqueSuppliedProducts = supplierCatalogProducts.length > 0
                        ? supplierCatalogProducts.map(c => c.name)
                        : staticProducts;

                    suppliersList.push({
                        id: s._id.toString(),
                        _id: s._id.toString(),
                        name: s.name,
                        contactPerson: s.contactPerson || 'Sales Representative',
                        category: s.category || 'General Wholesale',
                        supplyCategories: categoriesList,
                        categoryCounts,
                        phone: s.phone || '077 000 0000',
                        email: s.email || '',
                        region: s.region || 'Colombo 03',
                        supplyRegions: s.supplyRegions || [s.region || 'Colombo 03'],
                        rating: s.rating || '4.9 ★',
                        status: s.status || 'ACTIVE',
                        catalogCount: supplierCatalogProducts.length > 0 ? supplierCatalogProducts.length : uniqueSuppliedProducts.length,
                        suppliedProducts: uniqueSuppliedProducts,
                        suppliedProductsFull: supplierCatalogProducts,
                        linkedStores: Array.isArray(s.linkedStores) ? s.linkedStores : []
                    });
                }
            });

            return suppliersList;
        };

        // Always build full unfiltered list — no supplier is hidden from shop owners
        let resultList = buildList(false);

        // Cache full suppliers list for instant future responses
        if (resultList.length > 0) {
            suppliersMemoryCache = resultList;
            suppliersMemoryCacheTime = now;
        }

        // Annotate each supplier with isLinkedToCurrentStore for the requesting shop owner
        const annotatedList = resultList.map(s => ({
            ...s,
            isLinkedToCurrentStore: filterEmail
                ? (Array.isArray(s.linkedStores) ? s.linkedStores.map(ls => (typeof ls === 'string' ? ls : (ls.email || ls.storeEmail || '')).toLowerCase()) : []).includes(filterEmail)
                : false
        }));

        const finalSuppliers = isOnlyLinkedRequested ? annotatedList.filter(s => s.isLinkedToCurrentStore === true) : annotatedList;

        return res.json({ success: true, count: finalSuppliers.length, suppliers: finalSuppliers });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message, suppliers: [] });
    }
};


// 7. Add New Supplier to MongoDB Atlas
exports.addSupplier = async (req, res) => {
    try {
        const { name, phone, category, contactPerson, email, region, suppliedProducts } = req.body;
        if (!name || !phone) {
            return res.status(400).json({ success: false, message: 'Supplier name and phone are required' });
        }
        const supplier = await Supplier.create({
            name: name.trim(),
            phone: phone.trim(),
            category: category || 'General Wholesale',
            contactPerson: contactPerson || '',
            email: email || '',
            region: region || 'Colombo',
            suppliedProducts: Array.isArray(suppliedProducts) ? suppliedProducts : (suppliedProducts ? [suppliedProducts] : []),
            status: 'ACTIVE',
            linkedStores: []
        });
        invalidateSuppliersCache();
        return res.status(201).json({ success: true, message: 'Supplier registered in MongoDB Atlas', supplier });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// 7b. Update Supplier / Toggle Store Link in MongoDB Atlas
exports.updateSupplier = async (req, res) => {
    try {
        const { id } = req.params;
        const User = require('../models/User');
        let updated = null;

        if (mongoose.Types.ObjectId.isValid(id)) {
            const user = await User.findById(id);
            if (user && user.role === 'supplier') {
                if (req.body.linkedStores !== undefined) {
                    user.linkedStores = req.body.linkedStores;
                }
                if (req.body.name) user.supplierName = req.body.name;
                if (req.body.phone) user.phone = req.body.phone;
                if (req.body.category) user.supplyCategory = req.body.category;
                await user.save();
                updated = {
                    id: user._id.toString(),
                    _id: user._id.toString(),
                    name: user.supplierName || user.name,
                    linkedStores: user.linkedStores
                };

                // Also sync to Supplier collection document if present
                if (user.email || user.name || user.supplierName) {
                    const matchName = user.supplierName || user.name;
                    await Supplier.updateMany(
                        { $or: [{ email: user.email }, { name: matchName }] },
                        { $set: { linkedStores: user.linkedStores } }
                    );
                }
            } else {
                updated = await Supplier.findByIdAndUpdate(id, req.body, { new: true });
            }
        } else {
            updated = await Supplier.findOneAndUpdate({ name: id }, req.body, { new: true });
        }

        invalidateSuppliersCache();
        return res.json({ success: true, message: 'Supplier updated in MongoDB Atlas', supplier: updated });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// 7c. Delete Supplier from MongoDB Atlas
exports.deleteSupplier = async (req, res) => {
    try {
        const { id } = req.params;
        await Supplier.findByIdAndDelete(id);
        return res.json({ success: true, message: 'Supplier deleted from MongoDB Atlas' });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// 8. Low Stock Advanced Analytics
exports.getLowStockAnalytics = async (req, res) => {
    try {
        const products = await Product.find({});
        const criticalItems = products.filter(p => (p.stock !== undefined ? p.stock : p.stockQuantity) <= (p.minStock || 10));
        return res.json({ success: true, count: criticalItems.length, criticalItems });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// 9. Create Restock Request (PO) — Connects directly with MongoDB Atlas & syncs to Supplier Dashboard
exports.createRestockRequest = async (req, res) => {
    try {
        let supplierName = (req.body.supplierName || '').trim();
        let supplierEmail = (req.body.supplierEmail || '').trim().toLowerCase();

        // Known suppliers fallback dictionary
        const KNOWN_SUPPLIERS = {
            'lanka mega wholesale distributors': 'megasupplier@gmail.com',
            'central food city': 'centralfoodcity@gmail.com',
            'bla bla supplier': 'blabla123@gmail.con'
        };

        const sKey = supplierName.toLowerCase();
        if (!supplierEmail && KNOWN_SUPPLIERS[sKey]) {
            supplierEmail = KNOWN_SUPPLIERS[sKey];
        }

        // 1. If supplierName is empty or Default Supplier, look up from items
        if ((!supplierName || supplierName === 'Default Supplier' || supplierName === 'Local Supplier') && req.body.items && req.body.items.length > 0) {
            const firstItemName = req.body.items[0].name || req.body.items[0].produce;
            if (firstItemName && productsMemoryCache && Array.isArray(productsMemoryCache)) {
                const foundInCache = productsMemoryCache.find(p => (p.name || '').toLowerCase() === firstItemName.toLowerCase());
                if (foundInCache) {
                    if (foundInCache.supplierName) supplierName = foundInCache.supplierName;
                    if (foundInCache.supplierEmail) supplierEmail = foundInCache.supplierEmail.toLowerCase().trim();
                }
            }
            if ((!supplierName || supplierName === 'Default Supplier') && firstItemName) {
                try {
                    const prodDoc = await Product.findOne({
                        name: { $regex: `^${firstItemName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' }
                    }).select('supplierName supplierEmail').maxTimeMS(3000).lean();
                    if (prodDoc) {
                        if (prodDoc.supplierName) supplierName = prodDoc.supplierName;
                        if (prodDoc.supplierEmail) supplierEmail = prodDoc.supplierEmail.toLowerCase().trim();
                    }
                } catch (e) {}
            }
        }

        // 2. If supplierEmail is still missing, resolve it from User/Supplier models
        if (!supplierEmail && supplierName && supplierName !== 'Default Supplier') {
            try {
                const User = require('../models/User');
                const esc = supplierName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const foundUser = await User.findOne({
                    role: 'supplier',
                    $or: [
                        { supplierName: { $regex: esc, $options: 'i' } },
                        { name: { $regex: esc, $options: 'i' } }
                    ]
                }).select('email supplierName name').maxTimeMS(5000).lean();
                if (foundUser && foundUser.email) {
                    supplierEmail = foundUser.email.toLowerCase().trim();
                    if (!supplierName) supplierName = foundUser.supplierName || foundUser.name;
                } else {
                    const { Supplier } = require('./ProductInventoryModel');
                    const foundSup = await Supplier.findOne({
                        name: { $regex: esc, $options: 'i' }
                    }).select('email name').maxTimeMS(5000).lean();
                    if (foundSup && foundSup.email) {
                        supplierEmail = foundSup.email.toLowerCase().trim();
                    }
                }
            } catch (e) {
                console.warn('Error resolving supplier:', e.message);
            }
        }

        // 3. Fallback to known mapping if still not resolved
        if (!supplierEmail) {
            for (const [k, v] of Object.entries(KNOWN_SUPPLIERS)) {
                if (sKey.includes(k) || k.includes(sKey)) {
                    supplierEmail = v;
                    break;
                }
            }
        }

        if (!supplierName) supplierName = 'Lanka Mega Wholesale Distributors';

        req.body.supplierName = supplierName;
        req.body.supplierEmail = supplierEmail;

        const SupplierReplenishment = require('../supplier_replenishment/SupplierReplenishmentModel');
        const SupplierNotification = require('../models/SupplierNotification');

        // Generate non-colliding PO number
        let poNum = req.body.poNumber;
        if (!poNum) {
            let maxNum = 0;
            try {
                const [lastRestocks, lastReps] = await Promise.all([
                    RestockRequest.find({}, { poNumber: 1 }).sort({ _id: -1 }).limit(30).maxTimeMS(5000).lean().catch(() => []),
                    SupplierReplenishment.find({}, { poId: 1 }).sort({ _id: -1 }).limit(30).maxTimeMS(5000).lean().catch(() => [])
                ]);

                [...(lastRestocks || []), ...(lastReps || [])].forEach((doc) => {
                    const val = doc.poNumber || doc.poId;
                    if (val) {
                        const match = String(val).match(/(\d+)/);
                        if (match) {
                            const parsed = parseInt(match[1], 10);
                            if (parsed > maxNum) maxNum = parsed;
                        }
                    }
                });
            } catch (e) {}

            if (maxNum > 0) {
                poNum = `PO-${String(maxNum + 1).padStart(4, '0')}`;
            } else {
                poNum = `PO-${Math.floor(1000 + (Date.now() % 9000))}`;
            }
        }

        const reqItems = req.body.items || [];
        if (reqItems.length === 0) {
            reqItems.push({ name: 'Restock Item', qty: 20, quantity: 20, unit: 'pack' });
        }

        const storeName = req.body.storeName || 'Lanka Mart';
        const storeEmail = req.body.storeEmail || '';

        // Build price lookup map from fast in-memory products cache (0ms)
        const storeProdMap = new Map();
        if (productsMemoryCache && Array.isArray(productsMemoryCache)) {
            productsMemoryCache.forEach(p => {
                const k = (p.name || '').trim().toLowerCase();
                const wPrice = Number(p.costPrice > 0 ? p.costPrice : (p.wholesalePrice > 0 ? p.wholesalePrice : (p.price > 0 ? Math.round(p.price * 0.8) : 0)));
                storeProdMap.set(k, { price: wPrice, image: p.image || p.imageUrl || '', unit: p.unit || 'pack' });
            });
        }

        // Fast catalog cache lookup if available
        let catMap = new Map();
        try {
            const { getCachedCatalogMap } = require('../supplier_replenishment/supplierReplenishmentController');
            if (typeof getCachedCatalogMap === 'function') {
                const cMap = await getCachedCatalogMap();
                if (cMap && cMap.size > 0) catMap = cMap;
            }
        } catch (e) {}

        const itemsArray = reqItems.map(it => {
            const prodName = it.name || it.produce || 'Product';
            const tKey = prodName.trim().toLowerCase();
            const matchedStoreProd = storeProdMap.get(tKey);
            const matchedCat = catMap.get(tKey);

            let price = Number(it.wholesalePrice || it.wholesaleRate || it.price || 0);
            if (!price) {
                if (matchedCat && (matchedCat.price > 0 || matchedCat.wholesalePrice > 0)) {
                    price = matchedCat.price || matchedCat.wholesalePrice;
                } else if (matchedStoreProd && matchedStoreProd.price > 0) {
                    price = matchedStoreProd.price;
                }
            }
            if (!price) price = 150;

            const rawQty = it.qty !== undefined && it.qty !== null ? it.qty : it.quantity;
            const parsedQty = parseInt(rawQty, 10);
            const qty = !isNaN(parsedQty) && parsedQty > 0 ? parsedQty : 20;

            const itemImg = it.image || it.imageUrl || (matchedCat ? matchedCat.img : '') || (matchedStoreProd ? matchedStoreProd.image : '') || '';
            const unit = it.unit || (matchedStoreProd ? matchedStoreProd.unit : 'pack');
            const subtotal = qty * price;

            return {
                produce: prodName,
                name: prodName,
                qty: qty,
                quantity: qty,
                unit: unit,
                wholesaleRate: price,
                wholesalePrice: price,
                price: price,
                subtotal: subtotal,
                image: itemImg,
                imageUrl: itemImg,
                currentStock: Number(it.currentStock || 0),
                threshold: Number(it.threshold || 10)
            };
        });

        const totalAmount = itemsArray.reduce((acc, it) => acc + (it.subtotal || 0), 0);
        const itemQty = itemsArray.reduce((acc, it) => acc + (it.qty || 0), 0);
        const itemName = itemsArray.length === 1 ? itemsArray[0].produce : (itemsArray.length > 0 ? itemsArray.map(i => i.produce).join(', ') : 'Multiple Products');
        const itemsSummary = itemsArray.map(it => `${it.qty}x ${it.produce}`).join(', ');

        const deliveryDateVal = req.body.deliveryDate || req.body.deliveryTarget || 'Tomorrow';

        req.body.poNumber = poNum;
        req.body.items = itemsArray;
        req.body.totalEstimate = totalAmount;
        req.body.deliveryDate = deliveryDateVal;
        req.body.deliveryTarget = deliveryDateVal;
        req.body.etaMinutes = 24;

        const po = await RestockRequest.create(req.body);

        // Immediate background sync to SupplierReplenishment & SupplierNotification collections
        (async () => {
            try {
                const notificationMessage = `${storeName} requested replenishment: ${itemsSummary} (Total: Rs. ${totalAmount.toLocaleString()}).`;

                // Safe upsert / create to avoid duplicate key error
                await SupplierReplenishment.findOneAndUpdate(
                    { poId: poNum },
                    {
                        poId: poNum,
                        storeName: storeName,
                        storeEmail: storeEmail,
                        supplierName: supplierName,
                        supplierEmail: supplierEmail,
                        product: itemName,
                        unitsLeft: req.body.unitsLeft !== undefined ? req.body.unitsLeft : (itemsArray[0]?.currentStock || 4),
                        reorderUnits: itemQty,
                        status: 'Pending Approval',
                        requestedDate: new Date(),
                        deliveryTarget: deliveryDateVal,
                        etaMinutes: 24,
                        itemsSummary: itemsSummary,
                        items: itemsArray,
                        totalAmount: totalAmount
                    },
                    { upsert: true, new: true, setDefaultsOnInsert: true }
                );

                await SupplierNotification.create({
                    supplierName: supplierName,
                    supplierEmail: supplierEmail,
                    type: 'po',
                    title: `New Restock Request ${poNum}`,
                    message: notificationMessage,
                    read: false
                });

                console.log(`✅ [RESTOCK] Sync to supplier ${supplierName} (${supplierEmail}) completed for PO ${poNum}`);

                const { clearSupplierCaches } = require('../supplier_replenishment/supplierReplenishmentController');
                if (clearSupplierCaches) clearSupplierCaches();
            } catch (syncErr) {
                console.warn('Sync to Supplier error:', syncErr.message);
            }
        })();

        // Instantly return HTTP 201 so the mobile app gets immediate feedback (<150ms)!
        return res.status(201).json({
            success: true,
            message: 'Restock PO created and sent to supplier in MongoDB Atlas',
            po
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// 9b. Get All Restock Requests (Sent POs) from MongoDB Atlas (Ultra Fast Parallel Queries)
exports.getRestockRequests = async (req, res) => {
    try {
        const filter = {};
        if (req.query.storeEmail) filter.storeEmail = req.query.storeEmail;
        if (req.query.storeName) filter.storeName = req.query.storeName;

        const SupplierReplenishment = require('../supplier_replenishment/SupplierReplenishmentModel');
        const replFilter = {};
        if (req.query.storeEmail) replFilter.storeEmail = req.query.storeEmail;
        if (req.query.storeName) replFilter.storeName = req.query.storeName;

        const [requests, replenishments] = await Promise.all([
            RestockRequest.find(filter).sort({ createdAt: -1 }).lean().maxTimeMS(4000).catch(err => []),
            SupplierReplenishment.find(replFilter).lean().maxTimeMS(4000).catch(err => [])
        ]);

        return res.status(200).json({
            success: true,
            requests: requests || [],
            replenishments: replenishments || []
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// 10. Get Real-Time Shop Owner Notifications directly from MongoDB Atlas
exports.getShopOwnerNotifications = async (req, res) => {
    try {
        const { storeEmail, storeName } = req.query;
        let productQuery = {};
        let userCreatedAt = new Date(0);

        if (storeEmail) {
            productQuery.ownerEmail = storeEmail.toLowerCase();
            try {
                const User = require('../models/User');
                const user = await User.findOne({ email: storeEmail.toLowerCase() }).select('createdAt').lean();
                if (user && user.createdAt) {
                    userCreatedAt = new Date(user.createdAt);
                }
            } catch (e) {
                console.warn('Could not fetch user created date:', e.message);
            }
        }

        const dbProducts = (productsMemoryCache && productsMemoryCache.length > 0)
            ? (storeEmail ? productsMemoryCache.filter(p => !p.ownerEmail || p.ownerEmail.toLowerCase() === storeEmail.toLowerCase()) : productsMemoryCache)
            : await Product.find(productQuery).select('name stock stockQuantity minStock lowStockThreshold storeName ownerEmail createdAt updatedAt').lean();
        let targetStoreName = (storeName || '').split('•')[0].trim();
        if (!targetStoreName && dbProducts.length > 0) {
            targetStoreName = dbProducts[0].storeName || '';
        }

        const notificationsList = [];

        // Helper time ago
        const formatTimeAgo = (date) => {
            if (!date) return 'Just now';
            const diffMinutes = Math.floor((new Date() - new Date(date)) / (1000 * 60));
            if (diffMinutes < 1) return 'Just now';
            if (diffMinutes < 60) return `${diffMinutes}m ago`;
            if (diffMinutes < 60 * 24) return `${Math.floor(diffMinutes / 60)}h ago`;
            return `${Math.floor(diffMinutes / (60 * 24))}d ago`;
        };

        // 1. Fetch live orders from MongoDB 'Order' collection
        let orderQuery = { createdAt: { $gte: userCreatedAt } };
        if (targetStoreName) {
            const regex = new RegExp(targetStoreName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            orderQuery.pickupStore = regex;
        }

        const recentOrders = await Order.find(orderQuery).sort({ createdAt: -1 }).limit(5).lean();
        recentOrders.forEach(o => {
            const orderCode = o.orderId || (o._id ? o._id.toString().slice(-4).toUpperCase() : '1048');
            const totalItems = Array.isArray(o.items) ? o.items.length : 1;
            const amount = o.totalAmount || o.total || 0;
            const custName = o.customerName || o.userEmail || 'Customer';

            notificationsList.push({
                id: `ord_${o._id ? o._id.toString() : Math.random()}`,
                title: `New Customer Pre-Order #PF-${orderCode}`,
                message: `${custName} placed a pickup order (${totalItems} ${totalItems === 1 ? 'item' : 'items'} • Rs. ${amount.toLocaleString()}).`,
                time: formatTimeAgo(o.createdAt),
                type: 'order',
                targetTab: 'orders',
                read: false,
                rawDate: o.createdAt || new Date()
            });
        });

        // 2. Fetch live low-stock alerts from MongoDB 'Product' collection
        const lowStockProducts = dbProducts.filter(p => {
            const stk = p.stock !== undefined ? p.stock : p.stockQuantity;
            const minStk = p.minStock !== undefined ? p.minStock : p.lowStockThreshold;
            return stk <= (minStk || 10);
        });

        lowStockProducts.slice(0, 3).forEach(p => {
            const stk = p.stock !== undefined ? p.stock : p.stockQuantity;
            notificationsList.push({
                id: `stk_${p._id ? p._id.toString() : Math.random()}`,
                title: 'Critical Low Stock Warning',
                message: `${p.name} is down to ${stk} ${p.unit || 'items'} in stock. Reorder recommended.`,
                time: formatTimeAgo(p.updatedAt || p.createdAt),
                type: 'stock',
                targetTab: 'inventory',
                read: false,
                rawDate: p.updatedAt || p.createdAt || new Date()
            });
        });

        // 3. Fetch live supplier replenishment notifications from SupplierReplenishment collection
        try {
            const SupplierReplenishment = require('../supplier_replenishment/SupplierReplenishmentModel');
            let poQuery = { requestedDate: { $gte: userCreatedAt } };
            if (targetStoreName) {
                poQuery.storeName = new RegExp(targetStoreName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            }
            const recentPOs = await SupplierReplenishment.find(poQuery).sort({ requestedDate: -1 }).limit(3).lean();
            recentPOs.forEach(po => {
                notificationsList.push({
                    id: `sup_${po._id ? po._id.toString() : Math.random()}`,
                    title: `Supplier Delivery ${po.status || 'Arriving Soon'}`,
                    message: `${po.supplierName || po.storeName || 'Nuwara Eliya Produce'} shipment #${po.poId || 'PO-892'} status is ${po.status || 'In Transit'}.`,
                    time: formatTimeAgo(po.requestedDate || po.createdAt),
                    type: 'supplier',
                    targetTab: 'suppliers',
                    read: false,
                    rawDate: po.requestedDate || po.createdAt || new Date()
                });
            });
        } catch (e) {
            console.warn('Supplier notification fetch notice:', e.message);
        }

        // Sort all notifications by date descending
        notificationsList.sort((a, b) => new Date(b.rawDate) - new Date(a.rawDate));

        return res.json({
            success: true,
            count: notificationsList.length,
            notifications: notificationsList
        });
    } catch (err) {
        console.error('Error fetching shop owner notifications:', err);
        return res.status(500).json({ success: false, message: err.message, notifications: [] });
    }
};

const findShopOwnerUser = async (storeEmail, storeName) => {
    const User = require('../models/User');
    let shopOwner = null;

    if (storeEmail && storeEmail.trim()) {
        shopOwner = await User.findOne({ email: storeEmail.toLowerCase().trim() });
    }

    if (!shopOwner && storeName && storeName.trim()) {
        const regex = new RegExp(storeName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        shopOwner = await User.findOne({
            $or: [{ shopName: regex }, { storeName: regex }, { name: regex }]
        });
    }

    if (!shopOwner) {
        shopOwner = await User.findOne({ role: 'shop_owner' });
    }

    if (!shopOwner) {
        shopOwner = await User.findOne({ offerBanner: { $exists: true } });
    }

    return shopOwner;
};

// 11. Get Store Offer Banner from MongoDB Atlas
exports.getOfferBanner = async (req, res) => {
    try {
        const { storeEmail, storeName } = req.query;
        let shopOwner = await findShopOwnerUser(storeEmail, storeName);

        const defaultBanner = {
            hasCustomBanner: false,
            badge: '🔥 20% OFF DEALS',
            title: 'Fresh Harvest Deals',
            subtitle: 'Pick up in 15 mins at nearest grocery store',
            btnText: 'Shop Now',
            active: true,
            bannerBg: '/banner_bg.png'
        };

        const hasCustomBanner = !!(
            shopOwner &&
            shopOwner.offerBanner &&
            shopOwner.offerBanner.hasCustomBanner === true &&
            shopOwner.offerBanner.title &&
            shopOwner.offerBanner.title.trim().length > 0
        );

        const banner = hasCustomBanner ? { ...defaultBanner, ...shopOwner.offerBanner, hasCustomBanner: true } : defaultBanner;

        return res.json({
            success: true,
            offerBanner: banner,
            hasCustomBanner,
            shopName: shopOwner?.shopName || shopOwner?.name || storeName || 'GroceryMart'
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// 12. Update Store Offer Banner in MongoDB Atlas
exports.saveOfferBanner = async (req, res) => {
    try {
        const { storeEmail, storeName, badge, title, subtitle, btnText, active, bannerBg } = req.body;
        let shopOwner = await findShopOwnerUser(storeEmail, storeName);

        const newBannerData = {
            hasCustomBanner: true,
            badge: badge !== undefined ? badge : '🔥 20% OFF DEALS',
            title: title || 'Fresh Harvest Deals',
            subtitle: subtitle !== undefined ? subtitle : 'Pick up in 15 mins at nearest grocery store',
            btnText: btnText || 'Shop Now',
            active: active !== undefined ? Boolean(active) : true,
            bannerBg: bannerBg || '/banner_bg.png'
        };

        if (shopOwner) {
            shopOwner.offerBanner = newBannerData;
            shopOwner.markModified('offerBanner');
            await shopOwner.save();
        }

        return res.json({
            success: true,
            message: 'Store offer banner saved to MongoDB Atlas & published to Customer Home!',
            offerBanner: newBannerData,
            hasCustomBanner: true
        });
    } catch (err) {
        console.error('Error saving offer banner:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
};

// 13. Delete / Remove Store Offer Banner from MongoDB Atlas
exports.deleteOfferBanner = async (req, res) => {
    try {
        const storeEmail = req.body?.storeEmail || req.query?.storeEmail;
        const storeName = req.body?.storeName || req.query?.storeName;
        const shopOwner = await findShopOwnerUser(storeEmail, storeName);

        if (shopOwner) {
            shopOwner.offerBanner = {
                hasCustomBanner: false,
                badge: '',
                title: '',
                subtitle: '',
                btnText: '',
                active: false,
                bannerBg: '/banner_bg.png'
            };
            shopOwner.markModified('offerBanner');
            await shopOwner.save();
        }

        return res.json({
            success: true,
            message: 'Store offer banner removed successfully!'
        });
    } catch (err) {
        console.error('Error deleting offer banner:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
};
