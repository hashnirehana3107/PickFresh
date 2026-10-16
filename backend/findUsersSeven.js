const mongoose = require('mongoose');

const uri = 'mongodb+srv://admin:Admin%40123@cluster0.910rlkg.mongodb.net/?retryWrites=true&w=majority';

async function findUsersSeven() {
    try {
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
        const admin = mongoose.connection.db.admin();
        const dbs = await admin.listDatabases();
        console.log('=== FINDING COLLECTIONS WITH EXACTLY 7 DOCS OR USERS ===');
        for (const dbInfo of dbs.databases) {
            const db = mongoose.connection.client.db(dbInfo.name);
            const collections = await db.listCollections().toArray();
            for (const c of collections) {
                const count = await db.collection(c.name).countDocuments();
                if (c.name === 'users' || c.name === 'products' || count === 7) {
                    console.log(`DB: [${dbInfo.name}] -> Collection: [${c.name}] => ${count} docs`);
                }
            }
        }
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

findUsersSeven();
