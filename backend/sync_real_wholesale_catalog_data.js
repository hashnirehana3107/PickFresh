const mongoose = require('mongoose');
require('dotenv').config();

async function syncRealData() {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;

    const catCol = db.collection('supplierproductcatalogs');
    const prodCol = db.collection('products');
    const repCol = db.collection('supplierreplenishments');
    const resCol = db.collection('restockrequests');

    // 1. Fetch images from products & catalog
    const anchorDoc = await catCol.findOne({ productName: /Anchor Butter/i }) || await prodCol.findOne({ name: /Anchor Butter/i }) || {};
    const muncheeDoc = await catCol.findOne({ productName: /Munchee/i }) || await prodCol.findOne({ name: /Munchee/i }) || {};

    const anchorImg = anchorDoc.image || anchorDoc.imageUrl || '';
    const muncheeImg = muncheeDoc.image || muncheeDoc.imageUrl || '';

    // Exact Wholesale Prices matching User's Supplier Catalog UI (Image 2)
    const anchorPrice = 650;
    const muncheePrice = 250;

    // Update catalog collection to ensure consistency
    await catCol.updateOne(
        { productName: /Anchor Butter/i },
        { $set: { price: anchorPrice, wholesalePrice: anchorPrice, image: anchorImg } },
        { upsert: false }
    );

    await catCol.updateOne(
        { productName: /Munchee/i },
        { $set: { price: muncheePrice, wholesalePrice: muncheePrice, image: muncheeImg } },
        { upsert: false }
    );

    const updatedItems = [
        {
            name: 'Anchor Butter Salted 100g',
            produce: 'Anchor Butter Salted 100g',
            qty: 20,
            unit: 'pack',
            image: anchorImg,
            imageUrl: anchorImg,
            wholesaleRate: anchorPrice,
            wholesalePrice: anchorPrice,
            subtotal: anchorPrice * 20,
            currentStock: 4,
            minOrder: 10
        },
        {
            name: 'Munchee Super Cream Cracker',
            produce: 'Munchee Super Cream Cracker',
            qty: 20,
            unit: 'pack',
            image: muncheeImg,
            imageUrl: muncheeImg,
            wholesaleRate: muncheePrice,
            wholesalePrice: muncheePrice,
            subtotal: muncheePrice * 20,
            currentStock: 6,
            minOrder: 10
        }
    ];

    const totalOrderValue = updatedItems.reduce((sum, i) => sum + i.subtotal, 0); // (20*650)+(20*250) = 13000 + 5000 = 18000

    console.log('Anchor Butter -> Wholesale Price: Rs.', anchorPrice, '| Image Length:', anchorImg.length);
    console.log('Munchee Cracker -> Wholesale Price: Rs.', muncheePrice, '| Image Length:', muncheeImg.length);
    console.log('Calculated Total Order Value: Rs.', totalOrderValue);

    await repCol.updateMany({}, {
        $set: {
            items: updatedItems,
            totalAmount: totalOrderValue,
            itemsSummary: '20x Anchor Butter Salted 100g, 20x Munchee Super Cream Cracker'
        }
    });

    await resCol.updateMany({}, {
        $set: {
            items: updatedItems,
            totalAmount: totalOrderValue,
            itemsSummary: '20x Anchor Butter Salted 100g, 20x Munchee Super Cream Cracker'
        }
    });

    console.log('MongoDB Atlas collections updated successfully!');
    process.exit(0);
}

syncRealData().catch(err => {
    console.error(err);
    process.exit(1);
});
