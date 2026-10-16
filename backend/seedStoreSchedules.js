const mongoose = require('mongoose');
const StoreSchedule = require('./order_pickup/StoreScheduleModel');

const uri = 'mongodb+srv://admin:Admin%40123@cluster0.910rlkg.mongodb.net/pickfresh_db?retryWrites=true&w=majority';

const seedSchedules = [
    {
        storeName: 'PickFresh Super • Main Counter',
        slots: [
            { id: 'slot1', time: '4:00 PM', duration: '4:00 PM - 4:30 PM', capacity: 10, isBlocked: false },
            { id: 'slot2', time: '4:30 PM', duration: '4:30 PM - 5:00 PM', capacity: 10, isBlocked: false },
            { id: 'slot3', time: '5:00 PM', duration: '5:00 PM - 5:30 PM', capacity: 10, isBlocked: false },
            { id: 'slot4', time: '5:30 PM', duration: '5:30 PM - 6:00 PM', capacity: 10, isBlocked: false },
            { id: 'slot5', time: '6:00 PM', duration: '6:00 PM - 6:30 PM', capacity: 10, isBlocked: false }
        ]
    },
    {
        storeName: 'TNW Supermart • Kollupitiya',
        slots: [
            { id: 'slot1', time: '5:00 PM', duration: '5:00 PM - 5:30 PM', capacity: 12, isBlocked: false },
            { id: 'slot2', time: '5:30 PM', duration: '5:30 PM - 6:00 PM', capacity: 12, isBlocked: false },
            { id: 'slot3', time: '6:00 PM', duration: '6:00 PM - 6:30 PM', capacity: 15, isBlocked: false }
        ]
    },
    {
        storeName: 'GroceryMart',
        slots: [
            { id: 'slot1', time: '4:00 PM', duration: '4:00 PM - 4:30 PM', capacity: 10, isBlocked: false },
            { id: 'slot2', time: '4:30 PM', duration: '4:30 PM - 5:00 PM', capacity: 10, isBlocked: false },
            { id: 'slot3', time: '5:00 PM', duration: '5:00 PM - 5:30 PM', capacity: 10, isBlocked: false },
            { id: 'slot4', time: '5:30 PM', duration: '5:30 PM - 6:00 PM', capacity: 10, isBlocked: false }
        ]
    }
];

async function runSeed() {
    try {
        console.log('Connecting to MongoDB Atlas...');
        await mongoose.connect(uri);
        console.log('Connected! Seeding storeschedules collection...');

        for (const item of seedSchedules) {
            await StoreSchedule.findOneAndUpdate(
                { storeName: item.storeName },
                { storeName: item.storeName, slots: item.slots },
                { upsert: true, new: true }
            );
            console.log(`Seeded store schedule for: ${item.storeName}`);
        }

        console.log('✅ Store schedules successfully created & seeded in MongoDB Atlas!');
        process.exit(0);
    } catch (err) {
        console.error('Error seeding store schedules:', err);
        process.exit(1);
    }
}

runSeed();
