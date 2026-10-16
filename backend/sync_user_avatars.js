const mongoose = require('mongoose');
const dns = require('dns');
if (dns.setDefaultResultOrder) dns.setDefaultResultOrder('ipv4first');

const User = require('./models/User');
const Order = require('./models/Order');

mongoose.connect('mongodb+srv://rehanahashni2001_db_user:r6CuFSozjBxMKGX9@cluster0.tm1cjxu.mongodb.net/pickfresh_db?retryWrites=true&w=majority')
    .then(async () => {
        const users = await User.find({}).lean();
        console.log(`Found ${users.length} users in database.`);

        let updatedCount = 0;
        for (const u of users) {
            if (u.picture && u.picture.length > 10) {
                const conds = [];
                if (u._id) conds.push({ customer: u._id });
                if (u.email) conds.push({ customerEmail: new RegExp(`^${u.email.trim()}$`, 'i') });
                if (u.name) conds.push({ customerName: new RegExp(`^${u.name.trim()}$`, 'i') });

                if (conds.length > 0) {
                    const res = await Order.updateMany(
                        { $or: conds },
                        { $set: { customerAvatar: u.picture, customerImage: u.picture } }
                    );
                    console.log(`Updated ${res.modifiedCount} orders for user: ${u.name} (${u.email})`);
                    updatedCount += res.modifiedCount;
                }
            } else {
                // Clear legacy unsplash URLs
                const conds = [];
                if (u._id) conds.push({ customer: u._id });
                if (u.email) conds.push({ customerEmail: new RegExp(`^${u.email.trim()}$`, 'i') });
                if (u.name) conds.push({ customerName: new RegExp(`^${u.name.trim()}$`, 'i') });

                if (conds.length > 0) {
                    await Order.updateMany(
                        { $or: conds },
                        { $set: { customerAvatar: '', customerImage: '' } }
                    );
                }
            }
        }

        // Also clean any remaining order documents containing unsplash.com
        const cleanRes = await Order.updateMany(
            { $or: [{ customerAvatar: /unsplash/i }, { customerImage: /unsplash/i }] },
            { $set: { customerAvatar: '', customerImage: '' } }
        );
        console.log(`Cleaned ${cleanRes.modifiedCount} unsplash legacy order records.`);

        console.log(`Total orders synced with real user profile pictures: ${updatedCount}`);
        process.exit(0);
    })
    .catch(err => {
        console.error('Error syncing user avatars:', err);
        process.exit(1);
    });
