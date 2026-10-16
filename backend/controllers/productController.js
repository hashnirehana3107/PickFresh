const Product = require('../models/Product');

// Sample mock seed products if database is empty
const seedProducts = [
    { name: 'Fresh Red Tomatoes', category: 'Vegetables', price: 320, unit: 'kg', stockQuantity: 45, lowStockThreshold: 10, stockStatus: 'In Stock', description: 'Fresh farm red tomatoes' },
    { name: 'Green Beans', category: 'Vegetables', price: 280, unit: 'kg', stockQuantity: 8, lowStockThreshold: 10, stockStatus: 'Low Stock', description: 'Organic green beans' },
    { name: 'Coca-Cola 1.5L', category: 'Beverages', price: 420, unit: 'bottle', stockQuantity: 4, lowStockThreshold: 10, stockStatus: 'Low Stock', description: 'Refreshing carbonated soft drink' },
    { name: 'Fresh White Bread', category: 'Bakery', price: 190, unit: 'loaf', stockQuantity: 25, lowStockThreshold: 5, stockStatus: 'In Stock', description: 'Soft oven-baked white bread' },
    { name: 'Anchor Full Cream Milk 400g', category: 'Dairy', price: 1150, unit: 'pack', stockQuantity: 0, lowStockThreshold: 5, stockStatus: 'Out of Stock', description: 'Full cream milk powder' },
    { name: 'Keeri Samba Rice 5kg', category: 'Staples', price: 1450, unit: 'bag', stockQuantity: 30, lowStockThreshold: 5, stockStatus: 'In Stock', description: 'Premium quality Keeri Samba rice' }
];

// @desc Get all products (FR01)
// @route GET /api/products
exports.getProducts = async (req, res) => {
    try {
        let query = {};
        if (req.query.search) {
            query.name = { $regex: req.query.search, $options: 'i' };
        }
        if (req.query.category && req.query.category !== 'All') {
            query.category = req.query.category;
        }
        if (req.query.storeEmail) {
            query.ownerEmail = req.query.storeEmail.toLowerCase();
        }

        let products = await Product.find(query);

        // Auto seed mock data only if the ENTIRE database is empty and we aren't filtering for a specific shop owner's storeEmail.
        if (products.length === 0 && !req.query.search && !req.query.storeEmail) {
            const totalCount = await Product.countDocuments();
            if (totalCount === 0) {
                products = await Product.insertMany(seedProducts);
            }
        }

        res.json({ success: true, count: products.length, products });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc Get product by ID
// @route GET /api/products/:id
exports.getProductById = async (req, res) => {
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

// @desc Create new product (FR05 - CRUD Create)
// @route POST /api/products
exports.createProduct = async (req, res) => {
    try {
        const { name, category, price, unit, brand, stockQuantity, lowStockThreshold, description, supplierName, storeEmail, storeName, storeIcon } = req.body;
        const product = await Product.create({
            name,
            category,
            price,
            unit: unit || 'kg',
            brand: brand || '',
            stockQuantity: Number(stockQuantity) || 0,
            lowStockThreshold: Number(lowStockThreshold) || 10,
            description: description || '',
            supplierName: supplierName || 'Local Supplier',
            ownerEmail: storeEmail ? storeEmail.toLowerCase() : '',
            storeName: storeName || 'PickFresh Super',
            storeIcon: storeIcon || ''
        });
        res.status(201).json({ success: true, message: 'Product created successfully', product });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc Update product (FR05 - CRUD Update)
// @route PUT /api/products/:id
exports.updateProduct = async (req, res) => {
    try {
        let product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        Object.assign(product, req.body);
        await product.save();

        res.json({ success: true, message: 'Product updated successfully', product });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc Delete product (FR05 - CRUD Delete)
// @route DELETE /api/products/:id
exports.deleteProduct = async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        res.json({ success: true, message: 'Product deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
