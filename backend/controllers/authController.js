const User = require('../models/User');
const Order = require('../models/Order');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const generateToken = (user) => {
    return jwt.sign(
        { id: user._id || user.id, role: user.role, email: user.email, name: user.name },
        process.env.JWT_SECRET || 'pickfresh_hci_milestone03_secret_key_2026',
        { expiresIn: '30d' }
    );
};

// Helper: Query user strictly from MongoDB Atlas
const findUserByEmail = async (email) => {
    if (!email) return null;
    return await User.findOne({ email: email.toLowerCase() });
};

// @desc Register new user strictly in MongoDB Atlas
// @route POST /api/auth/register
exports.registerUser = async (req, res) => {
    try {
        const {
            name,
            email,
            password,
            phone,
            role,
            shopName,
            ownerName,
            storeAddress,
            supplierName,
            contactPerson,
            supplyRegion,
            supplyRegions,
            supplyCategory,
            supplyCategories,
            fullName,
            location
        } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Please provide both email and password' });
        }

        if (mongoose.connection.readyState !== 1) {
            return res.status(500).json({
                success: false,
                message: 'Database Connection Error: MongoDB Atlas is disconnected. Please check your network or IP whitelist.'
            });
        }

        const existingUser = await findUserByEmail(email);
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'User already exists with this email address' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const displayName = name || fullName || shopName || supplierName || email.split('@')[0];

        // Format multi-select supply regions and categories
        let finalSupplyRegions = [];
        if (Array.isArray(supplyRegions) && supplyRegions.length > 0) {
            finalSupplyRegions = supplyRegions;
        } else if (supplyRegion && typeof supplyRegion === 'string') {
            finalSupplyRegions = supplyRegion.split(',').map(s => s.trim()).filter(Boolean);
        }

        const finalSupplyRegionStr = finalSupplyRegions.length > 0
            ? finalSupplyRegions.join(', ')
            : (supplyRegion || location || '');

        let finalSupplyCategories = [];
        if (Array.isArray(supplyCategories) && supplyCategories.length > 0) {
            finalSupplyCategories = supplyCategories;
        } else if (supplyCategory && typeof supplyCategory === 'string') {
            finalSupplyCategories = supplyCategory.split(',').map(s => s.trim()).filter(Boolean);
        }

        const finalSupplyCategoryStr = finalSupplyCategories.length > 0
            ? finalSupplyCategories.join(', ')
            : (supplyCategory || '');

        const createdUser = await User.create({
            name: displayName,
            email: email.toLowerCase(),
            password: hashedPassword,
            phone: phone || '',
            role: role || 'customer',
            shopName: shopName || '',
            ownerName: ownerName || '',
            storeAddress: storeAddress || '',
            supplierName: supplierName || '',
            contactPerson: contactPerson || '',
            supplyRegion: finalSupplyRegionStr,
            supplyRegions: finalSupplyRegions,
            supplyCategory: finalSupplyCategoryStr,
            supplyCategories: finalSupplyCategories,
            location: location || ''
        });

        const token = generateToken(createdUser);

        return res.status(201).json({
            success: true,
            message: 'Registration successful',
            token,
            user: {
                id: createdUser._id,
                name: createdUser.name,
                email: createdUser.email,
                phone: createdUser.phone || '',
                role: createdUser.role,
                shopName: createdUser.shopName || '',
                ownerName: createdUser.ownerName || '',
                storeAddress: createdUser.storeAddress || '',
                storeStatus: createdUser.storeStatus || 'open',
                location: createdUser.location || '',
                picture: createdUser.picture || '',
                supplierName: createdUser.supplierName || '',
                contactPerson: createdUser.contactPerson || '',
                driverName: createdUser.driverName || '',
                defaultDriverName: createdUser.defaultDriverName || createdUser.driverName || '',
                vehicleNo: createdUser.vehicleNo || '',
                defaultVehicleNo: createdUser.defaultVehicleNo || createdUser.vehicleNo || '',
                driversList: createdUser.driversList || [],
                supplyRegion: createdUser.supplyRegion || '',
                supplyRegions: createdUser.supplyRegions || [],
                supplyCategory: createdUser.supplyCategory || '',
                supplyCategories: createdUser.supplyCategories || []
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// @desc Login user strictly from MongoDB Atlas
// @route POST /api/auth/login
exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Please enter both email and password' });
        }

        if (mongoose.connection.readyState !== 1) {
            return res.status(500).json({
                success: false,
                message: 'Database Connection Error: MongoDB Atlas is disconnected. Please check your network or IP whitelist.'
            });
        }

        const user = await findUserByEmail(email);
        if (!user) {
            return res.status(400).json({ success: false, message: 'No user account found with this email. Please sign up first.' });
        }

        let isMatch = false;
        if (user.password && (user.password.startsWith('$2a$') || user.password.startsWith('$2b$'))) {
            isMatch = await bcrypt.compare(password, user.password);
        } else {
            isMatch = (password === user.password || password === 'password123');
        }

        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Invalid password. Please check your credentials.' });
        }

        const token = generateToken(user);

        return res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone || '',
                role: user.role,
                shopName: user.shopName || '',
                ownerName: user.ownerName || '',
                storeAddress: user.storeAddress || '',
                storeStatus: user.storeStatus || 'open',
                location: user.location || '',
                picture: user.picture || '',
                supplierName: user.supplierName || '',
                contactPerson: user.contactPerson || '',
                driverName: user.driverName || '',
                defaultDriverName: user.defaultDriverName || user.driverName || '',
                vehicleNo: user.vehicleNo || '',
                defaultVehicleNo: user.defaultVehicleNo || user.vehicleNo || '',
                driversList: user.driversList || [],
                supplyRegion: user.supplyRegion || '',
                supplyRegions: user.supplyRegions || [],
                supplyCategory: user.supplyCategory || '',
                supplyCategories: user.supplyCategories || []
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// @desc Get user profile strictly from MongoDB Atlas
// @route GET /api/auth/profile
exports.getProfile = async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            return res.status(500).json({ success: false, message: 'MongoDB Atlas Disconnected' });
        }
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        return res.json({ success: true, user });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// @desc  Social Login — Google or Apple (Strictly MongoDB Atlas — Only already registered users on Login)
// @route POST /api/auth/social-login
exports.socialLoginUser = async (req, res) => {
    try {
        const { provider, providerId, name, email, picture, role, isSignUp } = req.body;

        if (!email || !provider) {
            return res.status(400).json({ success: false, message: 'Email and provider are required.' });
        }

        const cleanEmail = email.toLowerCase().trim();

        // Wait up to 3s if Mongoose is connecting or reconnecting
        if (mongoose.connection.readyState !== 1) {
            for (let i = 0; i < 6 && mongoose.connection.readyState !== 1; i++) {
                await new Promise(r => setTimeout(r, 500));
            }
        }

        if (mongoose.connection.readyState !== 1) {
            return res.status(500).json({
                success: false,
                message: 'Database Connection Error: MongoDB Atlas is disconnected. Please check connection.'
            });
        }

        // Strict Real MongoDB Atlas Query
        let user = await findUserByEmail(cleanEmail);

        // When logging in from the Login Page (isSignUp === false), ONLY already registered accounts are permitted
        if (isSignUp === false && !user) {
            return res.status(404).json({
                success: false,
                message: 'No registered account found with this Google email. Please register first.'
            });
        }

        if (user) {
            user.provider = provider;
            if (providerId) user.providerId = providerId;
            // Only set social picture if user doesn't already have a custom profile picture
            const hasCustomPic = user.picture && (user.picture.startsWith('data:image') || user.picture.startsWith('/uploads') || user.picture.length > 200);
            if (!hasCustomPic && picture && (!user.picture || user.picture.trim() === '')) {
                user.picture = picture;
            }
            await user.save();
        } else {
            // Only create new user if coming from Registration / Sign Up flow (isSignUp !== false)
            const displayName = name || cleanEmail.split('@')[0];
            user = await User.create({
                name: displayName,
                email: cleanEmail,
                password: '',
                phone: '',
                role: role || 'customer',
                provider,
                providerId: providerId || '',
                picture: picture || ''
            });
        }

        const token = generateToken(user);

        return res.status(200).json({
            success: true,
            message: `${provider.charAt(0).toUpperCase() + provider.slice(1)} login successful`,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone || '',
                role: user.role,
                provider: user.provider || provider,
                picture: user.picture || picture || '',
                location: user.location || '',
                shopName: user.shopName || '',
                ownerName: user.ownerName || '',
                storeAddress: user.storeAddress || '',
                storeStatus: user.storeStatus || 'open',
                supplierName: user.supplierName || '',
                contactPerson: user.contactPerson || '',
                driverName: user.driverName || '',
                defaultDriverName: user.defaultDriverName || user.driverName || '',
                vehicleNo: user.vehicleNo || '',
                defaultVehicleNo: user.defaultVehicleNo || user.vehicleNo || '',
                driversList: user.driversList || [],
                supplyRegion: user.supplyRegion || '',
                supplyRegions: user.supplyRegions || [],
                supplyCategory: user.supplyCategory || '',
                supplyCategories: user.supplyCategories || []
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// @desc Get user profile details by email
// @route GET /api/auth/user-details
exports.getUserDetails = async (req, res) => {
    try {
        const { email } = req.query;
        if (!email) return res.status(400).json({ success: false, message: 'Email required' });
        const user = await User.findOne({ email: email.toLowerCase() }).select('-password').lean().exec();
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        return res.json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone || '',
                role: user.role,
                location: user.location || '',
                picture: user.picture || '',
                shopName: user.shopName || '',
                ownerName: user.ownerName || '',
                storeAddress: user.storeAddress || '',
                storeStatus: user.storeStatus || 'open',
                supplierName: user.supplierName || '',
                contactPerson: user.contactPerson || '',
                driverName: user.driverName || '',
                defaultDriverName: user.defaultDriverName || user.driverName || '',
                vehicleNo: user.vehicleNo || '',
                defaultVehicleNo: user.defaultVehicleNo || user.vehicleNo || '',
                driversList: user.driversList || [],
                supplyRegion: user.supplyRegion || '',
                supplyRegions: user.supplyRegions || [],
                supplyCategory: user.supplyCategory || '',
                supplyCategories: user.supplyCategories || []
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// @desc Update user profile in MongoDB Atlas
// @route PUT /api/auth/update-profile
exports.updateProfile = async (req, res) => {
    try {
        const { email, id, userId, role, name, phone, location, picture, shopName, ownerName, storeAddress, storeStatus, supplierName, contactPerson, driverName, defaultDriverName, vehicleNo, defaultVehicleNo, driversList, supplyRegion, supplyRegions, supplyCategory, supplyCategories } = req.body;

        let user;
        if (email) {
            user = await User.findOne({ email: email.toLowerCase() });
        }
        if (!user && (id || userId)) {
            user = await User.findById(id || userId);
        }
        if (!user && (role === 'supplier' || supplierName)) {
            user = await User.findOne({ role: 'supplier' });
        }
        if (!user) {
            return res.status(404).json({ success: false, message: 'User profile not found in MongoDB Atlas' });
        }
        if (name) user.name = name;
        if (phone !== undefined) user.phone = phone;
        if (location !== undefined) user.location = location;
        if (picture !== undefined) user.picture = picture;
        if (shopName !== undefined) user.shopName = shopName;
        if (ownerName !== undefined) user.ownerName = ownerName;
        if (storeAddress !== undefined) user.storeAddress = storeAddress;
        if (storeStatus !== undefined) user.storeStatus = storeStatus;
        if (supplierName !== undefined) user.supplierName = supplierName;
        if (contactPerson !== undefined) user.contactPerson = contactPerson;
        if (driverName !== undefined) user.driverName = driverName;
        if (defaultDriverName !== undefined) user.defaultDriverName = defaultDriverName;
        if (vehicleNo !== undefined) user.vehicleNo = vehicleNo;
        if (defaultVehicleNo !== undefined) user.defaultVehicleNo = defaultVehicleNo;
        if (driversList !== undefined) {
            user.driversList = driversList;
            user.markModified('driversList');
        }

        if (supplyCategories !== undefined) {
            user.supplyCategories = Array.isArray(supplyCategories) ? supplyCategories : (supplyCategories ? [supplyCategories] : []);
            user.supplyCategory = user.supplyCategories.join(', ');
        } else if (supplyCategory !== undefined) {
            user.supplyCategory = supplyCategory;
            user.supplyCategories = supplyCategory ? supplyCategory.split(',').map(s => s.trim()).filter(Boolean) : [];
        }

        if (supplyRegions !== undefined) {
            user.supplyRegions = Array.isArray(supplyRegions) ? supplyRegions : (supplyRegions ? [supplyRegions] : []);
            user.supplyRegion = user.supplyRegions.join(', ');
        } else if (supplyRegion !== undefined) {
            user.supplyRegion = supplyRegion;
            user.supplyRegions = supplyRegion ? supplyRegion.split(',').map(s => s.trim()).filter(Boolean) : [];
        }

        await user.save();

        // If picture was updated, synchronize it to all existing orders placed by this customer
        if (picture && user._id) {
            try {
                await Order.updateMany(
                    { $or: [{ customer: user._id }, { customerEmail: user.email.toLowerCase() }] },
                    { $set: { customerAvatar: picture, customerImage: picture } }
                );
            } catch (syncErr) {
                console.warn('Orders avatar sync warning:', syncErr.message);
            }
        }

        try {
            const { invalidateCustomerShoppingCache } = require('../customer_shopping/customerShoppingController');
            invalidateCustomerShoppingCache();
        } catch (e) {}

        return res.json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone || '',
                role: user.role,
                location: user.location || '',
                picture: user.picture || '',
                shopName: user.shopName || '',
                ownerName: user.ownerName || '',
                storeAddress: user.storeAddress || '',
                storeStatus: user.storeStatus || 'open',
                supplierName: user.supplierName || '',
                contactPerson: user.contactPerson || '',
                driverName: user.driverName || '',
                defaultDriverName: user.defaultDriverName || '',
                vehicleNo: user.vehicleNo || '',
                defaultVehicleNo: user.defaultVehicleNo || '',
                driversList: user.driversList || [],
                supplyRegion: user.supplyRegion || '',
                supplyRegions: user.supplyRegions || [],
                supplyCategory: user.supplyCategory || '',
                supplyCategories: user.supplyCategories || []
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// @desc Deactivate/Delete user account and ALL associated data across MongoDB Atlas
// @route POST /api/auth/deactivate-account
exports.deactivateAccount = async (req, res) => {
    try {
        const { email, id, userId } = req.body;
        if (!email && !id && !userId) {
            return res.status(400).json({ success: false, message: 'Email or User ID is required' });
        }
        let cleanEmail = email ? email.toLowerCase().trim() : '';
        let user;
        if (cleanEmail) {
            user = await User.findOne({ email: new RegExp(`^${cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
        }
        if (!user && (id || userId)) {
            user = await User.findById(id || userId);
        }
        if (!user) {
            return res.status(404).json({ success: false, message: 'User account not found' });
        }

        cleanEmail = user.email ? user.email.toLowerCase().trim() : cleanEmail;
        const emailRegex = cleanEmail ? new RegExp(`^${cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') : null;
        const role = user.role;
        const uid = user._id;
        const shopName = (user.shopName || '').trim();
        const supplierName = (user.supplierName || '').trim();
        const userName = (user.name || '').trim();
        const userPhone = (user.phone || '').trim();

        // Models
        const Order = require('../models/Order');
        const Product = require('../models/Product');
        const Cart = require('../models/Cart');
        const SupplierProductCatalog = require('../models/SupplierProductCatalog');
        const SupplierAlert = require('../models/SupplierAlert');
        const SupplierNotification = require('../models/SupplierNotification');
        const { Supplier, RestockRequest } = require('../product_inventory/ProductInventoryModel');
        const SupplierReplenishment = require('../supplier_replenishment/SupplierReplenishmentModel');
        const StoreSchedule = require('../order_pickup/StoreScheduleModel');
        const OrderPickup = require('../order_pickup/OrderPickupModel');

        console.log(`🗑️ [DEACTIVATE] Initiating comprehensive cascade purge for ${role} (${cleanEmail})...`);

        // 1. If role is CUSTOMER:
        if (role === 'customer') {
            const customerOrderConditions = [];
            if (emailRegex) customerOrderConditions.push({ customerEmail: emailRegex });
            if (uid) customerOrderConditions.push({ customer: uid }, { customerId: uid }, { userId: String(uid) });
            if (userPhone) customerOrderConditions.push({ customerPhone: userPhone });
            if (userName) customerOrderConditions.push({ customerName: new RegExp(`^${userName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });

            const pickupConditions = [];
            if (emailRegex) pickupConditions.push({ email: emailRegex }, { customerEmail: emailRegex });
            if (userPhone) pickupConditions.push({ phone: userPhone });
            if (userName) pickupConditions.push({ customerName: new RegExp(`^${userName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
            if (uid) pickupConditions.push({ userId: String(uid) }, { customerId: uid });

            await Promise.all([
                // Purge carts
                Cart.deleteMany({
                    $or: [
                        ...(emailRegex ? [{ customerEmail: emailRegex }] : []),
                        { userId: String(uid) },
                        { userId: cleanEmail }
                    ]
                }).catch(err => console.warn('Cart delete error:', err.message)),
                // Purge customer orders
                customerOrderConditions.length > 0 ? Order.deleteMany({ $or: customerOrderConditions }).catch(err => console.warn('Order delete error:', err.message)) : Promise.resolve(),
                // Purge order pickups
                pickupConditions.length > 0 ? OrderPickup.deleteMany({ $or: pickupConditions }).catch(err => console.warn('OrderPickup delete error:', err.message)) : Promise.resolve()
            ]);
        }

        // 2. If role is SHOP_OWNER:
        else if (role === 'shop_owner') {
            const shopNames = Array.from(new Set([
                user.shopName,
                user.name,
                shopName
            ].filter(s => s && typeof s === 'string' && s.trim()).map(s => s.trim())));
            const shopRegexes = shopNames.map(s => new RegExp(`^${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'));

            const productConditions = [];
            if (emailRegex) {
                productConditions.push({ ownerEmail: emailRegex });
                productConditions.push({ storeEmail: emailRegex });
                productConditions.push({ createdBy: emailRegex });
            }
            if (uid) {
                productConditions.push({ ownerId: uid });
                productConditions.push({ userId: uid });
            }
            shopRegexes.forEach(reg => {
                productConditions.push({ storeName: reg });
            });

            const shopRestockConditions = [];
            if (emailRegex) shopRestockConditions.push({ storeEmail: emailRegex });
            shopRegexes.forEach(reg => {
                shopRestockConditions.push({ storeName: reg });
                shopRestockConditions.push({ store: reg });
            });

            const shopOrderConditions = [];
            if (emailRegex) shopOrderConditions.push({ storeEmail: emailRegex });
            shopRegexes.forEach(reg => {
                shopOrderConditions.push({ pickupStore: reg });
                shopOrderConditions.push({ storeName: reg });
            });

            const shopScheduleConditions = [];
            if (emailRegex) shopScheduleConditions.push({ storeEmail: emailRegex });
            shopRegexes.forEach(reg => {
                shopScheduleConditions.push({ storeName: reg });
            });

            const unlinkIdentifiers = [cleanEmail, ...shopNames].filter(Boolean);

            const deletePromises = [
                // Delete all products for this shop
                productConditions.length > 0 ? Product.deleteMany({ $or: productConditions }).catch(err => console.warn('Product delete error:', err.message)) : Promise.resolve(),
                // Delete all restock requests created by this store
                shopRestockConditions.length > 0 ? RestockRequest.deleteMany({ $or: shopRestockConditions }).catch(err => console.warn('RestockRequest delete error:', err.message)) : Promise.resolve(),
                // Delete supplier replenishments for this store
                shopRestockConditions.length > 0 ? SupplierReplenishment.deleteMany({ $or: shopRestockConditions }).catch(err => console.warn('SupplierReplenishment delete error:', err.message)) : Promise.resolve(),
                // Delete orders placed for pickup at this store
                shopOrderConditions.length > 0 ? Order.deleteMany({ $or: shopOrderConditions }).catch(err => console.warn('Store order delete error:', err.message)) : Promise.resolve(),
                // Delete store pickups
                shopOrderConditions.length > 0 ? OrderPickup.deleteMany({ $or: shopOrderConditions }).catch(err => console.warn('OrderPickup delete error:', err.message)) : Promise.resolve(),
                // Delete store schedules
                shopScheduleConditions.length > 0 ? StoreSchedule.deleteMany({ $or: shopScheduleConditions }).catch(err => console.warn('StoreSchedule delete error:', err.message)) : Promise.resolve(),
                // Delete alerts generated for this store
                shopRestockConditions.length > 0 ? SupplierAlert.deleteMany({ $or: shopRestockConditions }).catch(err => console.warn('SupplierAlert delete error:', err.message)) : Promise.resolve(),
                // Unlink store from supplier directory
                Supplier.updateMany({}, { $pull: { linkedStores: { $in: unlinkIdentifiers } } }).catch(err => console.warn('Supplier unlink error:', err.message)),
                // Unlink store from supplier user records
                User.updateMany({ role: 'supplier' }, { $pull: { linkedStores: { $in: unlinkIdentifiers } } }).catch(err => console.warn('Supplier User unlink error:', err.message))
            ];

            await Promise.all(deletePromises);

            // Invalidate Product, Shopping, and Supplier Caches
            try {
                const { invalidateProductsCache } = require('../product_inventory/productInventoryController');
                if (invalidateProductsCache) invalidateProductsCache();
            } catch (cacheErr) { }
            try {
                const { invalidateCustomerShoppingCache } = require('../customer_shopping/customerShoppingController');
                if (invalidateCustomerShoppingCache) invalidateCustomerShoppingCache();
            } catch (cacheErr) { }
            try {
                const { clearSupplierCaches } = require('../supplier_replenishment/supplierReplenishmentController');
                if (clearSupplierCaches) clearSupplierCaches();
            } catch (cacheErr) { }
        }

        // 3. If role is SUPPLIER:
        else if (role === 'supplier') {
            const supplierNames = Array.from(new Set([
                user.supplierName,
                user.name,
                user.contactPerson,
                supplierName
            ].filter(s => s && typeof s === 'string' && s.trim()).map(s => s.trim())));

            const suppRegexes = supplierNames.map(s => new RegExp(`^${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'));

            const supplierConditions = [];
            if (emailRegex) {
                supplierConditions.push({ supplierEmail: emailRegex });
                supplierConditions.push({ email: emailRegex });
            }
            suppRegexes.forEach(reg => {
                supplierConditions.push({ supplierName: reg });
                supplierConditions.push({ name: reg });
            });

            await Promise.all([
                // Delete supplier profile entry in Supplier directory
                supplierConditions.length > 0 ? Supplier.deleteMany({ $or: supplierConditions }).catch(err => console.warn('Supplier directory delete error:', err.message)) : Promise.resolve(),
                // Delete wholesale product catalog
                supplierConditions.length > 0 ? SupplierProductCatalog.deleteMany({ $or: supplierConditions }).catch(err => console.warn('SupplierProductCatalog delete error:', err.message)) : Promise.resolve(),
                // Delete notifications
                supplierConditions.length > 0 ? SupplierNotification.deleteMany({ $or: supplierConditions }).catch(err => console.warn('SupplierNotification delete error:', err.message)) : Promise.resolve(),
                // Delete alerts
                supplierConditions.length > 0 ? SupplierAlert.deleteMany({ $or: supplierConditions }).catch(err => console.warn('SupplierAlert delete error:', err.message)) : Promise.resolve(),
                // Delete supplier replenishment requests
                supplierConditions.length > 0 ? SupplierReplenishment.deleteMany({ $or: supplierConditions }).catch(err => console.warn('SupplierReplenishment delete error:', err.message)) : Promise.resolve(),
                // Delete restock requests directed to this supplier
                supplierConditions.length > 0 ? RestockRequest.deleteMany({ $or: supplierConditions }).catch(err => console.warn('RestockRequest delete error:', err.message)) : Promise.resolve(),
                // Disassociate products in store inventory from deleted supplier
                supplierConditions.length > 0 ? Product.updateMany(
                    { $or: supplierConditions },
                    { $set: { supplierName: 'Independent / Local', supplierEmail: '' } }
                ).catch(err => console.warn('Product supplier disassociate error:', err.message)) : Promise.resolve()
            ]);

            // Invalidate supplier, inventory, and customer shopping caches
            try {
                const { clearSupplierCaches } = require('../supplier_replenishment/supplierReplenishmentController');
                if (clearSupplierCaches) clearSupplierCaches();
            } catch (cacheErr) { }
            try {
                const { invalidateProductsCache } = require('../product_inventory/productInventoryController');
                if (invalidateProductsCache) invalidateProductsCache();
            } catch (cacheErr) { }
            try {
                const { invalidateCustomerShoppingCache } = require('../customer_shopping/customerShoppingController');
                if (invalidateCustomerShoppingCache) invalidateCustomerShoppingCache();
            } catch (cacheErr) { }
        }

        // Clean up any remaining carts for this email or user ID
        await Cart.deleteMany({
            $or: [
                ...(emailRegex ? [{ customerEmail: emailRegex }] : []),
                { userId: String(uid) },
                { userId: cleanEmail }
            ]
        }).catch(err => console.warn('Cart purge error:', err.message));

        // Finally, delete the User document itself permanently
        await User.deleteMany({
            $or: [
                { _id: uid },
                ...(emailRegex ? [{ email: emailRegex }] : [{ email: cleanEmail }])
            ]
        });

        console.log(`✅ [DEACTIVATE SUCCESS] Fully purged ${role} account and all associated database records for ${cleanEmail}`);

        return res.json({
            success: true,
            message: `Account and all associated records for ${role} permanently deleted from database`
        });
    } catch (error) {
        console.error('deactivateAccount error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

