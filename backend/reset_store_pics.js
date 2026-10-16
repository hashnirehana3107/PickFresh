const mongoose = require('mongoose');
const User = require('./models/User');
const connectDB = require('./config/db');

(async () => {
    try {
        await connectDB();
        const shopOwners = await User.find({ role: 'shop_owner' });
        console.log('Found shop owners:', shopOwners.length);

        for (const s of shopOwners) {
            const sName = s.shopName || s.name || '';
            if (s.picture && s.picture.includes('ui-avatars.com')) {
                s.picture = ''; // Clear ui-avatars fallback
            }

            // Set a real store profile picture logo for LankaMart as a demonstration of uploaded profile picture
            if (sName.toLowerCase().includes('lankamart') || sName.toLowerCase().includes('lanka')) {
                s.picture = '/logo.jpg';
            }

            await s.save();
            console.log(`Updated ${sName}: picture = "${s.picture}"`);
        }
    } catch (err) {
        console.error('Error updating shop pictures:', err);
    } finally {
        process.exit(0);
    }
})();
