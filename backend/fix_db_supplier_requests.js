const mongoose = require('mongoose');
require('dotenv').config();

const Product = require('./models/Product');
const { RestockRequest } = require('./product_inventory/ProductInventoryModel');
const SupplierReplenishment = require('./supplier_replenishment/SupplierReplenishmentModel');
const SupplierNotification = require('./models/SupplierNotification');

async function fixDatabase() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB Atlas...');

    // 1. Fix Products belonging to Central Food City
    const prodRes = await Product.updateMany(
        { name: { $in: ['Anchor Butter Salted 100g', 'Munchee Super Cream Cracker', 'Kotmale Butter 200g'] } },
        { $set: { supplierName: 'Central Food City' } }
    );
    console.log('Updated products:', prodRes);

    // 2. Fix RestockRequests (POs containing Central Food City items)
    const requests = await RestockRequest.find({}).lean();
    for (const req of requests) {
        const items = req.items || [];
        const isCentralItem = items.some(it =>
            it.name === 'Anchor Butter Salted 100g' ||
            it.name === 'Munchee Super Cream Cracker' ||
            it.name === 'Kotmale Butter 200g'
        );
        if (isCentralItem || req.supplierName === 'Lanka Mega Wholesale Distributors') {
            await RestockRequest.findByIdAndUpdate(req._id, {
                supplierName: 'Central Food City',
                supplierEmail: 'centralfoodcity@gmail.com'
            });
            console.log(`Updated RestockRequest PO ${req.poNumber} to Central Food City`);
        }
    }

    // 3. Fix SupplierReplenishment records
    const reps = await SupplierReplenishment.find({}).lean();
    for (const rep of reps) {
        const items = rep.items || [];
        const isCentralItem = items.some(it =>
            it.produce === 'Anchor Butter Salted 100g' ||
            it.produce === 'Munchee Super Cream Cracker' ||
            it.produce === 'Kotmale Butter 200g'
        ) || rep.product === 'Multiple Products';

        if (isCentralItem || rep.supplierName === 'Lanka Mega Wholesale Distributors') {
            await SupplierReplenishment.findByIdAndUpdate(rep._id, {
                supplierName: 'Central Food City',
                supplierEmail: 'centralfoodcity@gmail.com'
            });
            console.log(`Updated SupplierReplenishment record ${rep._id} to Central Food City`);
        }
    }

    // 4. Fix SupplierNotifications
    const notifs = await SupplierNotification.find({}).lean();
    for (const n of notifs) {
        if (n.supplierName === 'Lanka Mega Wholesale Distributors') {
            await SupplierNotification.findByIdAndUpdate(n._id, {
                supplierName: 'Central Food City',
                supplierEmail: 'centralfoodcity@gmail.com'
            });
            console.log(`Updated SupplierNotification ${n._id} to Central Food City`);
        }
    }

    console.log('ALL DATABASE UPDATES COMPLETED SUCCESSFULLY!');
    process.exit(0);
}

fixDatabase().catch(err => {
    console.error('Error fixing database:', err);
    process.exit(1);
});
