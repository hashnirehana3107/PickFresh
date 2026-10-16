const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('./models/Product');

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://admin:Admin%40123@cluster0.910rlkg.mongodb.net/pickfresh_db?retryWrites=true&w=majority';

async function seedAtlas() {
    try {
        console.log('Connecting to MongoDB Atlas Cloud...');
        await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
        console.log('✅ Connected to MongoDB Atlas Cloud Cluster0!');

        const seedProducts = [
            {
                name: 'Organic Hass Avocados',
                category: 'Fruits',
                price: 650,
                costPrice: 500,
                stock: 6,
                stockQuantity: 6,
                minStock: 10,
                lowStockThreshold: 10,
                status: 'LOW STOCK',
                stockStatus: 'Low Stock',
                storeName: 'Lanka Mart',
                image: '',
                imageUrl: '',
                fallbackEmoji: '🥑',
                bgColor: '#F0FDF4'
            },
            {
                name: 'Highland Fresh Milk 1L',
                category: 'Dairy',
                price: 420,
                costPrice: 340,
                stock: 3,
                stockQuantity: 3,
                minStock: 10,
                lowStockThreshold: 10,
                status: 'LOW STOCK',
                stockStatus: 'Low Stock',
                storeName: 'Lanka Mart',
                image: '/highland_milk.png',
                imageUrl: '/highland_milk.png',
                fallbackEmoji: '🥛',
                bgColor: '#EFF6FF'
            },
            {
                name: 'Red Bell Peppers',
                category: 'Vegetables',
                price: 890,
                costPrice: 700,
                stock: 24,
                stockQuantity: 24,
                minStock: 10,
                lowStockThreshold: 10,
                status: 'IN STOCK',
                stockStatus: 'In Stock',
                storeName: 'Lanka Mart',
                image: '',
                imageUrl: '',
                fallbackEmoji: '🫑',
                bgColor: '#FEF2F2'
            },
            {
                name: 'Fresh Cavendish Bananas',
                category: 'Fruits',
                price: 280,
                costPrice: 200,
                stock: 45, stockQuantity: 45,
                minStock: 10,
                lowStockThreshold: 10,
                status: 'IN STOCK',
                stockStatus: 'In Stock',
                storeName: 'Lanka Mart',
                image: '',
                imageUrl: '',
                fallbackEmoji: '🍌',
                bgColor: '#FEFCE8'
            },
            {
                name: 'Coca-Cola 1.5L',
                category: 'Beverages',
                price: 520,
                costPrice: 420,
                stock: 5,
                stockQuantity: 5,
                minStock: 10,
                lowStockThreshold: 10,
                status: 'LOW STOCK',
                stockStatus: 'Low Stock',
                storeName: 'Lanka Mart',
                image: '/coca_cola.png',
                imageUrl: '/coca_cola.png',
                fallbackEmoji: '🥤',
                bgColor: '#FEF2F2'
            },
            {
                name: 'Rice 5kg',
                category: 'Grains',
                price: 2450,
                costPrice: 2100,
                stock: 0,
                stockQuantity: 0,
                minStock: 5,
                lowStockThreshold: 5,
                status: 'OUT OF STOCK',
                stockStatus: 'Out of Stock',
                storeName: 'Lanka Mart',
                image: '/rice_5kg.png',
                imageUrl: '/rice_5kg.png',
                fallbackEmoji: '🌾',
                bgColor: '#FFFBEB'
            }
        ];

        await Product.deleteMany({});
        console.log('Cleared existing collection documents');

        const inserted = await Product.insertMany(seedProducts);
        console.log(`🎉 SUCCESS! Seeded ${inserted.length} products directly into MongoDB Atlas pickfresh_db > products collection!`);

        process.exit(0);
    } catch (err) {
        console.error('❌ Error seeding MongoDB Atlas:', err.message);
        process.exit(1);
    }
}

seedAtlas();
