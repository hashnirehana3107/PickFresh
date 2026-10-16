const mongoose = require('mongoose');

async function restockExistingOrder() {
    try {
        await mongoose.connect('mongodb+srv://rehanahashni2001_db_user:r6CuFSozjBxMKGX9@cluster0.tm1cjxu.mongodb.net/pickfresh_db?retryWrites=true&w=majority');
        console.log('Connected to MongoDB Atlas');

        const Product = mongoose.model('Product', new mongoose.Schema({}, { strict: false }), 'products');

        // Update Anchor Butter stock
        const res1 = await Product.updateMany(
            { name: /Anchor Butter/i },
            { $set: { stock: 20, stockQuantity: 20, status: 'IN STOCK', stockStatus: 'In Stock' } }
        );
        console.log('Anchor Butter restocked:', res1);

        // Update Munchee Cream Cracker stock
        const res2 = await Product.updateMany(
            { name: /Munchee/i },
            { $set: { stock: 30, stockQuantity: 30, status: 'IN STOCK', stockStatus: 'In Stock' } }
        );
        console.log('Munchee Cream Cracker restocked:', res2);

        process.exit(0);
    } catch (err) {
        console.error('Error during restock:', err);
        process.exit(1);
    }
}

restockExistingOrder();
