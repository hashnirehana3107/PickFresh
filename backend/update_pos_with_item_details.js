const mongoose = require('mongoose');
require('dotenv').config();

async function fixItems() {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;

    const prodCol = db.collection('products');
    const catCol = db.collection('supplierproductcatalogs');
    const repCol = db.collection('supplierreplenishments');
    const resCol = db.collection('restockrequests');

    // Fetch products to map images
    const anchorProd = await prodCol.findOne({ name: /Anchor Butter/i }) || await catCol.findOne({ productName: /Anchor Butter/i }) || {};
    const muncheeProd = await prodCol.findOne({ name: /Munchee/i }) || await catCol.findOne({ productName: /Munchee/i }) || {};

    const anchorImg = anchorProd.imageUrl || anchorProd.image || anchorProd.img || '';
    const muncheeImg = muncheeProd.imageUrl || muncheeProd.image || muncheeProd.img || '';

    console.log('Anchor Image Found:', Boolean(anchorImg), 'Length:', anchorImg.length);
    console.log('Munchee Image Found:', Boolean(muncheeImg), 'Length:', muncheeImg.length);

    const richItems = [
        {
            name: "Anchor Butter Salted 100g",
            produce: "Anchor Butter Salted 100g",
            qty: 20,
            unit: "pack",
            image: anchorImg,
            imageUrl: anchorImg,
            currentStock: 4,
            minOrder: 10,
            wholesaleRate: 150,
            subtotal: 3000
        },
        {
            name: "Munchee Super Cream Cracker",
            produce: "Munchee Super Cream Cracker",
            qty: 20,
            unit: "pack",
            image: muncheeImg,
            imageUrl: muncheeImg,
            currentStock: 6,
            minOrder: 10,
            wholesaleRate: 150,
            subtotal: 3000
        }
    ];

    const totalAmount = richItems.reduce((sum, item) => sum + item.subtotal, 0);

    const repDocs = await repCol.find({}).toArray();
    for (let doc of repDocs) {
        await repCol.updateOne({ _id: doc._id }, {
            $set: {
                items: richItems,
                itemsSummary: "20x Anchor Butter Salted 100g, 20x Munchee Super Cream Cracker",
                product: "Anchor Butter Salted 100g, Munchee Super Cream Cracker",
                reorderUnits: 40,
                unitsLeft: 10,
                threshold: 10,
                totalAmount: totalAmount
            }
        });
        console.log(`Updated SupplierReplenishment ${doc._id} with totalAmount = Rs. ${totalAmount}`);
    }

    const resDocs = await resCol.find({}).toArray();
    for (let doc of resDocs) {
        await resCol.updateOne({ _id: doc._id }, {
            $set: {
                items: richItems,
                itemsSummary: "20x Anchor Butter Salted 100g, 20x Munchee Super Cream Cracker",
                product: "Anchor Butter Salted 100g, Munchee Super Cream Cracker",
                reorderUnits: 40,
                unitsLeft: 10,
                threshold: 10,
                totalAmount: totalAmount
            }
        });
        console.log(`Updated RestockRequest ${doc._id} with totalAmount = Rs. ${totalAmount}`);
    }

    console.log('REPLENISHMENT COST & REAL IMAGE ENRICHMENT SUCCESSFUL!');
    process.exit(0);
}

fixItems().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
