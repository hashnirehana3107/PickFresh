const mongoose = require('mongoose');
const User = require('./models/User');
const connectDB = require('./config/db');

(async () => {
    try {
        await connectDB();
        const shopOwners = await User.find({ role: 'shop_owner' });
        console.log('Found shop owners:', shopOwners.length);

        for (const s of shopOwners) {
            const sName = s.shopName || s.name || 'Store';
            const bgColors = ['2D7B38', '15803D', '047857', '166534'];
            const randomColor = bgColors[Math.abs(s._id.toString().charCodeAt(0)) % bgColors.length];
            const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(sName)}&background=${randomColor}&color=fff&size=150&bold=true`;

            s.picture = avatarUrl;
            await s.save();
            console.log(`✅ Updated profile picture for store: ${sName} -> ${avatarUrl}`);
        }
    } catch (err) {
        console.error('Error updating shop pictures:', err);
    } finally {
        process.exit(0);
    }
})();
