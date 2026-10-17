const mongoose = require('mongoose');
const uri = 'mongodb+srv://rehanahashni2001_db_user:r6CuFSozjBxMKGX9@cluster0.tm1cjxu.mongodb.net/pickfresh_db?retryWrites=true&w=majority';

(async () => {
    console.time('connect');
    await mongoose.connect(uri);
    console.timeEnd('connect');

    // 1. Check products
    const prods = await mongoose.connection.collection('products').find({}).toArray();
    console.log('Total products:', prods.length);
    let totalProdBytes = 0;
    let storeIconBytes = 0;
    let imageBytes = 0;
    let imageUrlBytes = 0;

    prods.forEach(p => {
        const fullJson = JSON.stringify(p);
        totalProdBytes += fullJson.length;
        if (p.storeIcon) storeIconBytes += p.storeIcon.length;
        if (p.image) imageBytes += p.image.length;
        if (p.imageUrl) imageUrlBytes += p.imageUrl.length;
    });

    console.log('Total Products JSON size:', (totalProdBytes / 1024).toFixed(1), 'KB');
    console.log('  -> storeIcon field size:', (storeIconBytes / 1024).toFixed(1), 'KB');
    console.log('  -> image field size:', (imageBytes / 1024).toFixed(1), 'KB');
    console.log('  -> imageUrl field size:', (imageUrlBytes / 1024).toFixed(1), 'KB');
    console.log('  -> Other fields size:', ((totalProdBytes - storeIconBytes - imageBytes - imageUrlBytes) / 1024).toFixed(1), 'KB');

    // 2. Check users
    const users = await mongoose.connection.collection('users').find({}).toArray();
    console.log('\nTotal users:', users.length);
    let totalUserBytes = 0;
    users.forEach(u => {
        const len = JSON.stringify(u).length;
        totalUserBytes += len;
        console.log(`User: ${u.email} (${u.role}): ${Math.round(len / 1024)} KB (picture: ${Math.round((u.picture || '').length / 1024)} KB)`);
    });
    console.log('Total Users JSON size:', (totalUserBytes / 1024).toFixed(1), 'KB');

    // 3. Check catalogs
    const catalogs = await mongoose.connection.collection('supplierproductcatalogs').find({}).toArray();
    console.log('\nTotal supplier product catalogs:', catalogs.length);
    let totalCatalogBytes = 0;
    catalogs.forEach(c => {
        totalCatalogBytes += JSON.stringify(c).length;
    });
    console.log('Total Catalogs JSON size:', (totalCatalogBytes / 1024).toFixed(1), 'KB');

    process.exit(0);
})().catch(err => {
    console.error(err);
    process.exit(1);
});
