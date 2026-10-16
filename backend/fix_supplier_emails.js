/**
 * Migration: Fix existing RestockRequest & SupplierReplenishment records
 * - Adds supplierEmail based on matching User (role='supplier') by supplierName
 * - Ensures storeEmail is present on ReplenishmentRequests
 * Run: node fix_supplier_emails.js
 */
const mongoose = require('mongoose');

const URI = 'mongodb+srv://rehanahashni2001_db_user:r6CuFSozjBxMKGX9@cluster0.tm1cjxu.mongodb.net/pickfresh_db?retryWrites=true&w=majority';

const main = async () => {
    await mongoose.connect(URI, { family: 4 });
    console.log('✅ Connected to MongoDB Atlas');

    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    const RestockRequest = mongoose.model('RestockRequest', new mongoose.Schema({}, { strict: false }));
    const SupplierReplenishment = mongoose.model('SupplierReplenishment', new mongoose.Schema({}, { strict: false }));

    // Load all supplier users
    const supplierUsers = await User.find({ role: 'supplier' }).lean();
    console.log('Supplier Users:', supplierUsers.map(u => ({ name: u.supplierName || u.name, email: u.email })));

    // Build a lookup: supplierName (lowercase) -> email
    const supplierEmailMap = {};
    supplierUsers.forEach(u => {
        const sName = (u.supplierName || u.name || '').toLowerCase().trim();
        if (sName) supplierEmailMap[sName] = u.email || '';
    });
    console.log('Email map:', supplierEmailMap);

    // Fix RestockRequest records
    const reqs = await RestockRequest.find().lean();
    for (const req of reqs) {
        const sName = (req.supplierName || '').toLowerCase().trim();
        const email = supplierEmailMap[sName] || '';
        if (email && !req.supplierEmail) {
            await RestockRequest.updateOne({ _id: req._id }, { $set: { supplierEmail: email } });
            console.log(`Fixed RestockRequest ${req._id}: supplierEmail = ${email}`);
        }
    }

    // Fix SupplierReplenishment records
    const reps = await SupplierReplenishment.find().lean();
    for (const rep of reps) {
        const sName = (rep.supplierName || '').toLowerCase().trim();
        const email = supplierEmailMap[sName] || '';
        const updates = {};
        if (email && !rep.supplierEmail) updates.supplierEmail = email;
        if (Object.keys(updates).length > 0) {
            await SupplierReplenishment.updateOne({ _id: rep._id }, { $set: updates });
            console.log(`Fixed SupplierReplenishment ${rep._id}:`, updates);
        }
    }

    console.log('✅ Migration complete!');
    mongoose.connection.close();
};

main().catch(err => {
    console.error('Migration error:', err.message);
    process.exit(1);
});
