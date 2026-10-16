const mongoose = require('mongoose');
require('dotenv').config();

async function fix() {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;

    const repCol = db.collection('supplierreplenishments');
    const resCol = db.collection('restockrequests');

    const resDocs = await resCol.find({}).toArray();
    const resMap = new Map();
    resDocs.forEach(r => {
        if (r.poNumber) resMap.set(r.poNumber, r);
        if (r.poId) resMap.set(r.poId, r);
    });

    const repDocs = await repCol.find({}).toArray();
    for (let i = 0; i < repDocs.length; i++) {
        const doc = repDocs[i];
        const matchingRes = resMap.get(doc.poId) || resDocs[0];

        const items = (doc.items && doc.items.length > 0) ? doc.items : (matchingRes ? matchingRes.items.map(it => ({ produce: it.name, qty: it.qty, unit: it.unit })) : []);
        const summary = items.map(it => `${it.qty || 1}x ${it.produce || it.name}`).join(', ');
        const prodName = items.map(it => it.produce || it.name).join(', ');

        await repCol.updateOne({ _id: doc._id }, {
            $set: {
                items: items,
                itemsSummary: summary,
                product: prodName || 'Fresh Produce Restock',
                supplierName: 'Central Food City',
                supplierEmail: 'centralfoodcity@gmail.com'
            }
        });
        console.log(`Enriched SupplierReplenishment ${doc.poId}: product="${prodName}" with ${items.length} items`);
    }

    console.log('ENRICHMENT COMPLETE');
    process.exit(0);
}

fix().catch(err => { console.error(err); process.exit(1); });
