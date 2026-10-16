const mongoose = require('mongoose');
const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://rehanahashni2001_db_user:r6CuFSozjBxMKGX9@cluster0.tm1cjxu.mongodb.net/pickfresh_db?retryWrites=true&w=majority';

const SupplierProductCatalogSchema = new mongoose.Schema({
    supplierEmail: { type: String, required: true, lowercase: true, trim: true },
    supplierName: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, default: 'Snacks', trim: true },
    price: { type: Number, default: 0 },
    minOrderQty: { type: Number, default: 1 },
    unit: { type: String, default: '1kg', trim: true },
    image: { type: String, default: '' },
    status: { type: String, enum: ['Available', 'Out of Stock'], default: 'Available' },
    createdAt: { type: Date, default: Date.now }
});

const SupplierProductCatalog = mongoose.models.SupplierProductCatalog || mongoose.model('SupplierProductCatalog', SupplierProductCatalogSchema);

// Uses EXACT same category names as the Shop Owner's categories DB collection:
// Dairy & Eggs | Soft Drinks | Vegetables | Fruits | Snacks | Health & Beauty | Meat & Seafood | Household & Essentials

const seedProducts = [
    // --- LANKA MEGA WHOLESALE DISTRIBUTORS (megasupplier@gmail.com) ---
    { supplierEmail: 'megasupplier@gmail.com', supplierName: 'Lanka Mega Wholesale Distributors', name: 'Elephant House Soda 1L', category: 'Soft Drinks', price: 240, minOrderQty: 20, unit: '1L bottle', image: '/cat_bev.png' },
    { supplierEmail: 'megasupplier@gmail.com', supplierName: 'Lanka Mega Wholesale Distributors', name: 'Coca-Cola 1.5L', category: 'Soft Drinks', price: 380, minOrderQty: 10, unit: '1.5L bottle', image: '/cat_bev.png' },
    { supplierEmail: 'megasupplier@gmail.com', supplierName: 'Lanka Mega Wholesale Distributors', name: 'Sunquick Orange 840ml', category: 'Soft Drinks', price: 1250, minOrderQty: 5, unit: '840ml bottle', image: '/cat_bev.png' },
    { supplierEmail: 'megasupplier@gmail.com', supplierName: 'Lanka Mega Wholesale Distributors', name: 'Kist Mango Nectar 1L', category: 'Soft Drinks', price: 450, minOrderQty: 12, unit: '1L pack', image: '/cat_bev.png' },
    { supplierEmail: 'megasupplier@gmail.com', supplierName: 'Lanka Mega Wholesale Distributors', name: 'Anchor Milk Powder 400g', category: 'Dairy & Eggs', price: 1100, minOrderQty: 24, unit: '400g pack', image: '/cat_dairy.png' },
    { supplierEmail: 'megasupplier@gmail.com', supplierName: 'Lanka Mega Wholesale Distributors', name: 'Ratthi Milk Powder 400g', category: 'Dairy & Eggs', price: 1050, minOrderQty: 24, unit: '400g pack', image: '/cat_dairy.png' },
    { supplierEmail: 'megasupplier@gmail.com', supplierName: 'Lanka Mega Wholesale Distributors', name: 'Astra Margarine 250g', category: 'Dairy & Eggs', price: 360, minOrderQty: 10, unit: '250g tub', image: '/cat_dairy.png' },
    { supplierEmail: 'megasupplier@gmail.com', supplierName: 'Lanka Mega Wholesale Distributors', name: 'Maggi Noodles 75g (Box)', category: 'Snacks', price: 3200, minOrderQty: 2, unit: 'Box of 30', image: '/cat_bakery.png' },
    { supplierEmail: 'megasupplier@gmail.com', supplierName: 'Lanka Mega Wholesale Distributors', name: 'MD Mixed Jam 500g', category: 'Snacks', price: 580, minOrderQty: 12, unit: '500g bottle', image: 'https://images.unsplash.com/photo-1583095393430-8919bce3d42f?q=80&w=200&auto=format&fit=crop' },
    { supplierEmail: 'megasupplier@gmail.com', supplierName: 'Lanka Mega Wholesale Distributors', name: 'Surf Excel Washing Powder 1kg', category: 'Household & Essentials', price: 650, minOrderQty: 10, unit: '1kg pack', image: 'https://images.unsplash.com/photo-1584824486509-112e4181dc1c?q=80&w=200&auto=format&fit=crop' },
    { supplierEmail: 'megasupplier@gmail.com', supplierName: 'Lanka Mega Wholesale Distributors', name: 'Vim Dishwash Bar 100g', category: 'Household & Essentials', price: 65, minOrderQty: 50, unit: '100g bar', image: 'https://images.unsplash.com/photo-1585231061031-627702f30b91?q=80&w=200&auto=format&fit=crop' },
    { supplierEmail: 'megasupplier@gmail.com', supplierName: 'Lanka Mega Wholesale Distributors', name: 'Sunlight Soap', category: 'Household & Essentials', price: 110, minOrderQty: 24, unit: '110g bar', image: 'https://images.unsplash.com/photo-1600857062241-98e5dba7f214?q=80&w=200&auto=format&fit=crop' },
    { supplierEmail: 'megasupplier@gmail.com', supplierName: 'Lanka Mega Wholesale Distributors', name: 'Signal Toothpaste 160g', category: 'Health & Beauty', price: 290, minOrderQty: 12, unit: '160g tube', image: 'https://images.unsplash.com/photo-1559864239-0bfd5d7cb46f?q=80&w=200&auto=format&fit=crop' },

    // --- CENTRAL FOOD CITY (centralfoodcity@gmail.com) ---
    { supplierEmail: 'centralfoodcity@gmail.com', supplierName: 'Central Food City', name: 'Nuwara Eliya Carrots 1kg', category: 'Vegetables', price: 350, minOrderQty: 10, unit: '1kg pack', image: '/cat_veg.png' },
    { supplierEmail: 'centralfoodcity@gmail.com', supplierName: 'Central Food City', name: 'Fresh Leeks 1kg', category: 'Vegetables', price: 280, minOrderQty: 10, unit: '1kg pack', image: '/cat_veg.png' },
    { supplierEmail: 'centralfoodcity@gmail.com', supplierName: 'Central Food City', name: 'Green Beans 500g', category: 'Vegetables', price: 220, minOrderQty: 10, unit: '500g pack', image: '/cat_veg.png' },
    { supplierEmail: 'centralfoodcity@gmail.com', supplierName: 'Central Food City', name: 'Fresh Tomatoes 1kg', category: 'Vegetables', price: 450, minOrderQty: 15, unit: '1kg pack', image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?q=80&w=200&auto=format&fit=crop' },
    { supplierEmail: 'centralfoodcity@gmail.com', supplierName: 'Central Food City', name: 'Bell Pepper (Red) 250g', category: 'Vegetables', price: 380, minOrderQty: 5, unit: '250g pack', image: 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa8a?q=80&w=200&auto=format&fit=crop' },
    { supplierEmail: 'centralfoodcity@gmail.com', supplierName: 'Central Food City', name: 'Farmhouse Fresh Eggs', category: 'Dairy & Eggs', price: 1650, minOrderQty: 5, unit: 'Tray of 30', image: 'https://images.unsplash.com/photo-1587486913049-53fc88980cfc?q=80&w=200&auto=format&fit=crop' },
    { supplierEmail: 'centralfoodcity@gmail.com', supplierName: 'Central Food City', name: 'Kotmale Butter 200g', category: 'Dairy & Eggs', price: 850, minOrderQty: 10, unit: '200g pack', image: '/cat_dairy.png' },
    { supplierEmail: 'centralfoodcity@gmail.com', supplierName: 'Central Food City', name: 'Highland Fresh Milk 1L', category: 'Dairy & Eggs', price: 420, minOrderQty: 12, unit: '1L packet', image: '/highland_milk.png' },
    { supplierEmail: 'centralfoodcity@gmail.com', supplierName: 'Central Food City', name: 'Bairaha Whole Chicken (Frozen)', category: 'Meat & Seafood', price: 1350, minOrderQty: 10, unit: '1.2kg approx', image: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?q=80&w=200&auto=format&fit=crop' },
    { supplierEmail: 'centralfoodcity@gmail.com', supplierName: 'Central Food City', name: 'Keells Chicken Sausages 500g', category: 'Meat & Seafood', price: 780, minOrderQty: 15, unit: '500g pack', image: 'https://images.unsplash.com/photo-1626082927230-22c6fbddc0d1?q=80&w=200&auto=format&fit=crop' },
    { supplierEmail: 'centralfoodcity@gmail.com', supplierName: 'Central Food City', name: 'Prima Sandwich Bread 450g', category: 'Snacks', price: 190, minOrderQty: 20, unit: '450g loaf', image: '/cat_bakery.png' },
    { supplierEmail: 'centralfoodcity@gmail.com', supplierName: 'Central Food City', name: 'Munchee Super Cream Cracker', category: 'Snacks', price: 250, minOrderQty: 12, unit: '190g pack', image: '/cat_bakery.png' },
];

async function runMigration() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('Connected.');

        console.log('Clearing old catalog items...');
        await SupplierProductCatalog.deleteMany({});

        console.log('Seeding ' + seedProducts.length + ' products with DB-matched categories...');
        await SupplierProductCatalog.insertMany(seedProducts);

        console.log('Migration Complete! All categories now match Shop Owner DB categories:');
        console.log('  Dairy & Eggs | Soft Drinks | Vegetables | Snacks | Health & Beauty | Meat & Seafood | Household & Essentials');
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

runMigration();
