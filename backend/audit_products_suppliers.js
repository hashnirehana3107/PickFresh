const fs = require('fs');
const mongoose = require('mongoose');
require('dotenv').config();

const Product = require('./models/Product');
const User = require('./models/User');
const { Supplier, RestockRequest } = require('./product_inventory/ProductInventoryModel');
const SupplierProductCatalog = require('./models/SupplierProductCatalog');
const SupplierReplenishment = require('./supplier_replenishment/SupplierReplenishmentModel');

async function audit() {
    await mongoose.connect(process.env.MONGODB_URI);
    let out = '=== PRODUCTS ===\n';
    const products = await Product.find({}).lean();
    products.forEach(p => {
        out += `Product: "${p.name}" | Supplier: "${p.supplierName}" | Stock: ${p.stock} | minStock: ${p.minStock} | StoreEmail: "${p.ownerEmail}"\n`;
    });

    out += '\n=== SUPPLIER USERS ===\n';
    const users = await User.find({ role: 'supplier' }).lean();
    users.forEach(u => {
        out += `SupplierUser: "${u.name}" / supplierName: "${u.supplierName}" | email: "${u.email}"\n`;
    });

    out += '\n=== SUPPLIER CATALOGS ===\n';
    const catalogs = await SupplierProductCatalog.find({}).lean();
    catalogs.forEach(c => {
        out += `Catalog: "${c.name}" | supplierName: "${c.supplierName}" | supplierEmail: "${c.supplierEmail}"\n`;
    });

    out += '\n=== RESTOCK REQUESTS ===\n';
    const requests = await RestockRequest.find({}).lean();
    requests.forEach(r => {
        out += `PO: "${r.poNumber}" | supplierName: "${r.supplierName}" | status: "${r.status}" | items: ${JSON.stringify(r.items)}\n`;
    });

    out += '\n=== SUPPLIER REPLENISHMENTS ===\n';
    const reps = await SupplierReplenishment.find({}).lean();
    reps.forEach(r => {
        out += `Replenishment ID: ${r._id} | supplierName: "${r.supplierName}" | supplierEmail: "${r.supplierEmail}" | product: "${r.product}" | status: "${r.status}"\n`;
    });

    fs.writeFileSync('audit_utf8.txt', out, 'utf8');
    console.log('AUDIT COMPLETED SUCESSFULLY');
    process.exit(0);
}

audit().catch(console.error);
