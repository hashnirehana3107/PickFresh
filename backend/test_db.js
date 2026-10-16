const fs = require('fs');
const mongoose = require('mongoose');

const uri = 'mongodb+srv://rehanahashni2001_db_user:r6CuFSozjBxMKGX9@cluster0.tm1cjxu.mongodb.net/pickfresh_db?retryWrites=true&w=majority';

mongoose.connect(uri, { family: 4, serverSelectionTimeoutMS: 10000 }).then(async () => {
    const users = await mongoose.connection.db.collection('users').find({}).toArray();
    let out = '=== USERS ===\n';
    users.forEach((u, i) => {
        out += `[${i}] Email: ${u.email} | Role: ${u.role} | Name: ${u.name} | ShopName: ${u.shopName} | SupplierName: ${u.supplierName}\n`;
        out += `     linkedStores: ${JSON.stringify(u.linkedStores)}\n`;
    });

    const suppliers = await mongoose.connection.db.collection('suppliers').find({}).toArray();
    out += '\n=== SUPPLIERS COLLECTION ===\n';
    suppliers.forEach((s, i) => {
        out += `[${i}] Email: ${s.email} | Name: ${s.name} | linkedStores: ${JSON.stringify(s.linkedStores)}\n`;
    });

    const products = await mongoose.connection.db.collection('products').find({}).toArray();
    out += '\n=== PRODUCTS (suppliers & owners) ===\n';
    products.forEach((p, i) => {
        out += `[${i}] Name: ${p.name} | Supplier: ${p.supplierName} | StoreName: ${p.storeName} | OwnerEmail: ${p.ownerEmail}\n`;
    });

    fs.writeFileSync('./debug_out.txt', out);
    console.log('DONE_WRITING');
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
