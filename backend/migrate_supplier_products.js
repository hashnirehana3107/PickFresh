const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');
const SupplierProductCatalog = require('./models/SupplierProductCatalog');

const seedCatalogData = [
    // Lanka Mega Wholesale Distributors
    {
        supplierEmail: 'megasupplier@gmail.com',
        supplierName: 'Lanka Mega Wholesale Distributors',
        name: 'Bairaha Whole Chicken 1kg',
        category: 'Poultry, Meat & Seafood',
        price: 1250,
        minOrderQty: 10,
        unit: '1kg pack',
        status: 'Available'
    },
    {
        supplierEmail: 'megasupplier@gmail.com',
        supplierName: 'Lanka Mega Wholesale Distributors',
        name: 'Nuwara Eliya Carrots 1kg',
        category: 'Fresh Produce (Vegetables & Fruits)',
        price: 320,
        minOrderQty: 15,
        unit: '1kg pack',
        status: 'Available'
    },
    {
        supplierEmail: 'megasupplier@gmail.com',
        supplierName: 'Lanka Mega Wholesale Distributors',
        name: 'Anchor Milk Powder 400g',
        category: 'Dairy & Eggs',
        price: 1080,
        minOrderQty: 12,
        unit: '400g pack',
        status: 'Available'
    },
    {
        supplierEmail: 'megasupplier@gmail.com',
        supplierName: 'Lanka Mega Wholesale Distributors',
        name: 'Surf Excel Washing Powder 1kg',
        category: 'Household & Cleaning',
        price: 650,
        minOrderQty: 10,
        unit: '1kg pack',
        status: 'Available'
    },
    {
        supplierEmail: 'megasupplier@gmail.com',
        supplierName: 'Lanka Mega Wholesale Distributors',
        name: 'Elephant House Soda 1L',
        category: 'Beverages & Juices',
        price: 240,
        minOrderQty: 20,
        unit: '1L bottle',
        status: 'Available'
    },

    // Central Food City
    {
        supplierEmail: 'centralfoodcity@gmail.com',
        supplierName: 'Central Food City',
        name: 'Fresh Green Beans 500g',
        category: 'Fresh Produce (Vegetables & Fruits)',
        price: 220,
        minOrderQty: 10,
        unit: '500g pack',
        status: 'Available'
    },
    {
        supplierEmail: 'centralfoodcity@gmail.com',
        supplierName: 'Central Food City',
        name: 'Kist Tomato Sauce 400g',
        category: 'Packaged Groceries & Staples',
        price: 450,
        minOrderQty: 8,
        unit: 'bottle',
        status: 'Available'
    },
    {
        supplierEmail: 'centralfoodcity@gmail.com',
        supplierName: 'Central Food City',
        name: 'Kotmale Butter 200g',
        category: 'Dairy & Eggs',
        price: 750,
        minOrderQty: 5,
        unit: '200g block',
        status: 'Available'
    },

    // ABC Distributors
    {
        supplierEmail: 'sales@abcdistributors.lk',
        supplierName: 'ABC Distributors',
        name: 'Coca-Cola 1.5L',
        category: 'Beverages & Juices',
        price: 380,
        minOrderQty: 12,
        unit: '1.5L bottle',
        status: 'Available'
    },
    {
        supplierEmail: 'sales@abcdistributors.lk',
        supplierName: 'ABC Distributors',
        name: 'Sprite 1.5L',
        category: 'Beverages & Juices',
        price: 380,
        minOrderQty: 12,
        unit: '1.5L bottle',
        status: 'Available'
    },
    {
        supplierEmail: 'sales@abcdistributors.lk',
        supplierName: 'ABC Distributors',
        name: 'Fanta Orange 1.5L',
        category: 'Beverages & Juices',
        price: 380,
        minOrderQty: 12,
        unit: '1.5L bottle',
        status: 'Available'
    },

    // Fresh Fields
    {
        supplierEmail: 'supply@freshfields.lk',
        supplierName: 'Fresh Fields',
        name: 'Nuwara Eliya Carrots 1kg',
        category: 'Fresh Produce (Vegetables & Fruits)',
        price: 340,
        minOrderQty: 20,
        unit: '1kg pack',
        status: 'Available'
    },
    {
        supplierEmail: 'supply@freshfields.lk',
        supplierName: 'Fresh Fields',
        name: 'Fresh Chicken Eggs 10 pack',
        category: 'Poultry, Meat & Seafood',
        price: 480,
        minOrderQty: 10,
        unit: '10 pack',
        status: 'Available'
    },

    // Lanka Dairy Supply
    {
        supplierEmail: 'orders@lankadairy.lk',
        supplierName: 'Lanka Dairy Supply',
        name: 'Anchor Milk Powder 400g',
        category: 'Dairy & Eggs',
        price: 1080,
        minOrderQty: 10,
        unit: '400g pack',
        status: 'Available'
    },
    {
        supplierEmail: 'orders@lankadairy.lk',
        supplierName: 'Lanka Dairy Supply',
        name: 'Highland Salted Butter 200g',
        category: 'Dairy & Eggs',
        price: 780,
        minOrderQty: 10,
        unit: '200g block',
        status: 'Available'
    },
    {
        supplierEmail: 'orders@lankadairy.lk',
        supplierName: 'Lanka Dairy Supply',
        name: 'Kotmale Fresh Milk 1L',
        category: 'Dairy & Eggs',
        price: 450,
        minOrderQty: 12,
        unit: '1L pack',
        status: 'Available'
    }
];

async function migrateCatalog() {
    try {
        await connectDB();

        console.log('Seeding Supplier Product Catalogs...');
        for (const item of seedCatalogData) {
            const exists = await SupplierProductCatalog.findOne({
                supplierEmail: item.supplierEmail.toLowerCase(),
                name: item.name
            });
            if (!exists) {
                await SupplierProductCatalog.create(item);
                console.log(`+ Added catalog product "${item.name}" for ${item.supplierName}`);
            } else {
                console.log(`- Already exists: "${item.name}" for ${item.supplierName}`);
            }
        }
        console.log('✅ Catalog Migration Complete!');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrateCatalog();
