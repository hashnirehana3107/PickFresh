const mongoose = require('mongoose');

const storeScheduleSchema = new mongoose.Schema({
    storeName: { type: String, required: true, unique: true },
    slots: [{
        id: { type: String, required: true },
        time: { type: String, required: true },
        duration: { type: String, required: true },
        capacity: { type: Number, default: 10 },
        isBlocked: { type: Boolean, default: false }
    }]
}, { collection: 'storeschedules', timestamps: true });

const StoreSchedule = mongoose.models.StoreSchedule || mongoose.model('StoreSchedule', storeScheduleSchema);

module.exports = StoreSchedule;
