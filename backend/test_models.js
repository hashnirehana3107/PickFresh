const mongoose = require('mongoose');
const URI = 'mongodb+srv://rehanahashni2001_db_user:r6CuFSozjBxMKGX9@cluster0.tm1cjxu.mongodb.net/pickfresh_db?retryWrites=true&w=majority';
mongoose.connect(URI).then(async () => {
    // We want to test why getDashboardStats returned 0 for Lanka Mega
    // The controller uses SupplierReplenishment and RestockRequest from ProductInventoryModel
    const { RestockRequest } = require('./product_inventory/ProductInventoryModel');
    const SupplierReplenishment = require('./supplier_replenishment/SupplierReplenishmentModel');

    const condition = { $or: [{ supplierEmail: /megasupplier@gmail\.com/i }, { supplierName: /Lanka Mega Wholesale Distributors/i }] };
    const pRR = await RestockRequest.countDocuments({ ...condition, status: 'Pending' });
    const pSR = await SupplierReplenishment.countDocuments({ ...condition, status: { $in: ['Pending Approval', 'Pending'] } });
    console.log('Using Models - pRR:', pRR, 'pSR:', pSR);
    process.exit(0);
});
