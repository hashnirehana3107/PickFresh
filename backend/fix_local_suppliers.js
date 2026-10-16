const dotenv = require('dotenv');
const connectDB = require('./config/db');
const Product = require('./models/Product');
const User = require('./models/User');

dotenv.config();

async function fixSuppliers() {
    await connectDB();

    console.log('--- Checking products with supplierName "Local Supplier" ---');

    // Find all supplier users to match the default supplier
    const suppliers = await User.find({ role: 'supplier' }).lean();
    const defaultSupplierName = suppliers.length > 0 && suppliers[0].supplierName
        ? suppliers[0].supplierName
        : 'Lanka Mega Wholesale Distributors';

    console.log(`Target default supplier: "${defaultSupplierName}"`);

    const result = await Product.updateMany(
        { $or: [{ supplierName: 'Local Supplier' }, { supplierName: '' }, { supplierName: { $exists: false } }] },
        { $set: { supplierName: defaultSupplierName } }
    );

    console.log(`Updated ${result.modifiedCount} products from "Local Supplier" to "${defaultSupplierName}".`);
    process.exit(0);
}

fixSuppliers().catch(err => {
    console.error('Error fixing suppliers:', err);
    process.exit(1);
});
