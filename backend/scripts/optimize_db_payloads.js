const mongoose = require('mongoose');
const connectDB = require('../config/db');

(async () => {
    console.log('Connecting to MongoDB Atlas via connectDB...');
    await connectDB();
    console.log('Connected!');

    // 1. Remove storeIcon and duplicate imageUrl from all products
    const pUnsetRes = await mongoose.connection.collection('products').updateMany(
        {},
        { $unset: { storeIcon: "" } }
    );
    console.log(`✅ Unset storeIcon on products. Matched/modified:`, pUnsetRes.modifiedCount);

    // 2. Clean users: Optimize shop owners with clean fast asset paths
    const users = await mongoose.connection.collection('users').find({}).toArray();
    console.log(`Found ${users.length} users:`);
    for (const u of users) {
        const emailLower = (u.email || '').toLowerCase().trim();
        console.log(`- ${u._id} : ${emailLower} (${u.role}), picture length: ${(u.picture || '').length}`);

        if (emailLower.includes('grocery')) {
            const res = await mongoose.connection.collection('users').updateOne(
                { _id: u._id },
                { $set: { picture: '/GroceryMart.jpg', storeLogo: '/GroceryMart.jpg' } }
            );
            console.log(`  -> Updated ${emailLower} to /GroceryMart.jpg (modified: ${res.modifiedCount})`);
        } else if (emailLower.includes('lanka')) {
            const res = await mongoose.connection.collection('users').updateOne(
                { _id: u._id },
                { $set: { picture: '/logo.jpg', storeLogo: '/logo.jpg' } }
            );
            console.log(`  -> Updated ${emailLower} to /logo.jpg (modified: ${res.modifiedCount})`);
        } else if (u.picture && u.picture.length > 5000) {
            const res = await mongoose.connection.collection('users').updateOne(
                { _id: u._id },
                { $set: { picture: '' } }
            );
            console.log(`  -> Cleared oversized picture for ${emailLower} (modified: ${res.modifiedCount})`);
        }
    }

    // 3. Clean orders: Remove base64 avatars
    const oRes = await mongoose.connection.collection('orders').updateMany(
        { customerAvatar: { $exists: true } },
        { $set: { customerAvatar: '', customerImage: '' } }
    );
    console.log(`✅ Cleaned orders customerAvatar/customerImage (modified: ${oRes.modifiedCount})`);

    // 4. Verify products
    const prods = await mongoose.connection.collection('products').find({}).toArray();
    console.log(`Total products: ${prods.length}, total JSON size: ${(JSON.stringify(prods).length / 1024).toFixed(1)} KB`);

    process.exit(0);
})().catch(err => {
    console.error('Migration error:', err);
    process.exit(1);
});
