const OrderPickup = require('./OrderPickupModel');
const StoreSchedule = require('./StoreScheduleModel');
const Order = require('../models/Order');
const mongoose = require('mongoose');
const connectDB = require('../config/db');

// Default initial slots for seeding with explicit IDs
const defaultSlotsByStore = {
    'PickFresh Super • Main Counter': [
        { id: 'slot1', time: '4:00 PM', duration: '4:00 PM - 4:30 PM', capacity: 10, isBlocked: false },
        { id: 'slot2', time: '4:30 PM', duration: '4:30 PM - 5:00 PM', capacity: 10, isBlocked: false },
        { id: 'slot3', time: '5:00 PM', duration: '5:00 PM - 5:30 PM', capacity: 10, isBlocked: false },
        { id: 'slot4', time: '5:30 PM', duration: '5:30 PM - 6:00 PM', capacity: 10, isBlocked: false },
        { id: 'slot5', time: '6:00 PM', duration: '6:00 PM - 6:30 PM', capacity: 10, isBlocked: false }
    ],
    'TNW Supermart • Kollupitiya': [
        { id: 'slot_tnw_1', time: '5:00 PM', duration: '5:00 PM - 5:30 PM', capacity: 12, isBlocked: false },
        { id: 'slot_tnw_2', time: '5:30 PM', duration: '5:30 PM - 6:00 PM', capacity: 12, isBlocked: false },
        { id: 'slot_tnw_3', time: '6:00 PM', duration: '6:00 PM - 6:30 PM', capacity: 15, isBlocked: false }
    ],
    'GroceryMart': [
        { id: 'gm_slot1', time: '4:00 PM', duration: '4:00 PM - 4:30 PM', capacity: 10, isBlocked: false },
        { id: 'gm_slot2', time: '4:30 PM', duration: '4:30 PM - 5:00 PM', capacity: 10, isBlocked: false },
        { id: 'gm_slot3', time: '5:00 PM', duration: '5:00 PM - 5:30 PM', capacity: 10, isBlocked: false },
        { id: 'gm_slot4', time: '5:30 PM', duration: '5:30 PM - 6:00 PM', capacity: 10, isBlocked: false }
    ]
};

// In-memory cache fallback
let memorySlotsConfig = { ...defaultSlotsByStore };

// Helper to get or initialize store slots from MongoDB Atlas 'storeschedules' collection
const getStoreSlots = async (storeName) => {
    const rawKey = storeName && storeName.trim() ? storeName.trim() : 'PickFresh Super • Main Counter';

    // Helper for matching keys in default object
    const findMatchingDefaultKey = (name) => {
        const lower = name.toLowerCase();
        for (const k of Object.keys(defaultSlotsByStore)) {
            if (k.toLowerCase() === lower || k.toLowerCase().includes(lower) || lower.includes(k.toLowerCase())) {
                return k;
            }
        }
        return null;
    };

    const matchedDefaultKey = findMatchingDefaultKey(rawKey);
    const key = matchedDefaultKey || rawKey;

    if (mongoose.connection.readyState !== 1) {
        try { await connectDB(); } catch (e) {}
    }

    if (mongoose.connection.readyState === 1) {
        try {
            let scheduleDoc = await StoreSchedule.findOne({
                $or: [
                    { storeName: key },
                    { storeName: { $regex: new RegExp(`^${key.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}`, 'i') } },
                    { storeName: { $regex: new RegExp(rawKey.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'i') } }
                ]
            });

            if (!scheduleDoc) {
                // Determine initial slots to seed
                const initialSlots = defaultSlotsByStore[key] || defaultSlotsByStore[matchedDefaultKey] || [
                    { id: `slot_default_1`, time: '4:00 PM', duration: '4:00 PM - 4:30 PM', capacity: 10, isBlocked: false },
                    { id: `slot_default_2`, time: '4:30 PM', duration: '4:30 PM - 5:00 PM', capacity: 10, isBlocked: false },
                    { id: `slot_default_3`, time: '5:00 PM', duration: '5:00 PM - 5:30 PM', capacity: 10, isBlocked: false },
                    { id: `slot_default_4`, time: '5:30 PM', duration: '5:30 PM - 6:00 PM', capacity: 10, isBlocked: false }
                ];

                scheduleDoc = await StoreSchedule.create({
                    storeName: key,
                    slots: initialSlots
                });
            }

            // Ensure every slot has a guaranteed unique `id`
            let hasMissingId = false;
            const sanitizedSlots = scheduleDoc.slots.map((s, idx) => {
                const sObj = s.toObject ? s.toObject() : s;
                if (!sObj.id) {
                    sObj.id = sObj._id ? String(sObj._id) : `slot_${Date.now()}_${idx}`;
                    hasMissingId = true;
                }
                return sObj;
            });

            if (hasMissingId) {
                scheduleDoc.slots = sanitizedSlots;
                await scheduleDoc.save();
            }

            memorySlotsConfig[key] = sanitizedSlots;
            return { key: scheduleDoc.storeName || key, slots: sanitizedSlots, doc: scheduleDoc };
        } catch (dbErr) {
            console.warn('MongoDB StoreSchedule fetch/seed error:', dbErr.message);
        }
    }

    if (!memorySlotsConfig[key]) {
        memorySlotsConfig[key] = defaultSlotsByStore[matchedDefaultKey] || [
            { id: 'slot1', time: '4:00 PM', duration: '4:00 PM - 4:30 PM', capacity: 10, isBlocked: false },
            { id: 'slot2', time: '4:30 PM', duration: '4:30 PM - 5:00 PM', capacity: 10, isBlocked: false },
            { id: 'slot3', time: '5:00 PM', duration: '5:00 PM - 5:30 PM', capacity: 10, isBlocked: false },
            { id: 'slot4', time: '5:30 PM', duration: '5:30 PM - 6:00 PM', capacity: 10, isBlocked: false }
        ];
    }

    return { key, slots: memorySlotsConfig[key], doc: null };
};

// Helper to save store slots to MongoDB Atlas
const saveStoreSlots = async (key, slots) => {
    memorySlotsConfig[key] = slots;
    if (mongoose.connection.readyState !== 1) {
        try { await connectDB(); } catch (e) {}
    }
    if (mongoose.connection.readyState === 1) {
        try {
            await StoreSchedule.findOneAndUpdate(
                { storeName: key },
                { storeName: key, slots },
                { upsert: true, new: true }
            );
        } catch (err) {
            console.warn('MongoDB StoreSchedule save error:', err.message);
        }
    }
};

// Helper to normalize and clean time tokens for bulletproof slot matching
const cleanTimeToken = (s) => {
    if (!s) return '';
    return String(s)
        .toLowerCase()
        .replace(/\./g, ':')           // convert 1.30 to 1:30
        .replace(/\s+/g, '')           // remove all spaces e.g. "1:00 pm" -> "1:00pm"
        .replace(/^0(\d:)/, '$1');     // remove leading 0 e.g. "01:00pm" -> "1:00pm"
};

const matchSlotWithOrder = (orderSlotStr, slotTimeStr, slotDurationStr) => {
    if (!orderSlotStr) return false;
    const cleanOrderSlot = cleanTimeToken(orderSlotStr);
    const cleanTime = cleanTimeToken(slotTimeStr);
    const cleanDuration = cleanTimeToken(slotDurationStr);

    if (cleanTime && cleanOrderSlot.includes(cleanTime)) return true;
    if (cleanDuration && cleanOrderSlot.includes(cleanDuration)) return true;

    // Compare start times (e.g. "1:00pm" from "1:00pm-1:30pm" or "1:00pm-nextslot")
    const durationStart = cleanDuration ? cleanDuration.split('-')[0].trim() : '';
    if (durationStart && cleanOrderSlot.includes(durationStart)) return true;

    const orderStart = cleanOrderSlot.split('-')[0].trim();
    if (orderStart && cleanTime && (cleanTime.includes(orderStart) || orderStart.includes(cleanTime))) return true;

    return false;
};

// Helper to format schedule slots with live MongoDB orders
const formatSlotsWithOrders = async (rawSlots, storeNameKey) => {
    let orders = [];
    if (mongoose.connection.readyState !== 1) {
        try { await connectDB(); } catch (e) {}
    }
    if (mongoose.connection.readyState === 1) {
        try {
            let query = { status: { $ne: 'Cancelled' } };
            if (storeNameKey && storeNameKey.trim()) {
                const cleanKey = storeNameKey.split('•')[0].split('-')[0].trim();
                const regex = new RegExp(cleanKey.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'i');
                query.$or = [
                    { pickupStore: storeNameKey },
                    { pickupStore: { $regex: regex } },
                    { storeName: storeNameKey },
                    { storeName: { $regex: regex } }
                ];
            }
            orders = await Order.find(query).lean().exec();
        } catch (dbErr) {
            console.warn('DB query fallback in formatSlotsWithOrders:', dbErr.message);
        }
    }

    return rawSlots.map((slot, index) => {
        const slotId = slot.id || (slot._id ? String(slot._id) : `slot_${index + 1}_${Date.now()}`);
        const slotTimeStr = slot.time || '4:00 PM';
        const slotDurationStr = slot.duration || `${slotTimeStr} - Next Slot`;

        if (slot.isBlocked) {
            return {
                id: slotId,
                _id: slot._id ? String(slot._id) : slotId,
                time: slotTimeStr,
                duration: slotDurationStr,
                capacity: Number(slot.capacity) || 10,
                booked: Number(slot.capacity) || 10,
                remainingSlots: 0,
                full: true,
                isFull: true,
                isBlocked: true,
                status: 'Closed by Store',
                badge: 'CLOSED',
                badgeType: 'full'
            };
        }

        const bookedCount = orders.filter(o => {
            return matchSlotWithOrder(o.pickupTimeSlot, slotTimeStr, slotDurationStr);
        }).length;

        const cap = Number(slot.capacity) || 10;
        const remaining = Math.max(0, cap - bookedCount);
        const isFull = remaining <= 0;

        let badge = 'AVAILABLE';
        let badgeType = 'normal';
        let statusText = `${remaining} slots available`;

        if (isFull) {
            badge = 'UNAVAILABLE (FULL)';
            badgeType = 'full';
            statusText = 'Full (Unavailable)';
        } else if (remaining <= 3) {
            badge = `🔥 ${remaining} SLOT${remaining === 1 ? '' : 'S'} LEFT`;
            badgeType = 'hot';
            statusText = `${remaining} slots left`;
        }

        return {
            id: slotId,
            _id: slot._id ? String(slot._id) : slotId,
            time: slotTimeStr,
            duration: slotDurationStr,
            capacity: cap,
            booked: bookedCount,
            remainingSlots: remaining,
            full: isFull,
            isFull: isFull,
            isBlocked: false,
            status: statusText,
            badge: badge,
            badgeType: badgeType
        };
    });
};

// 1. Get Store Pickup Slots for Customer View
exports.getAvailableSlots = async (req, res) => {
    try {
        const { storeName = 'PickFresh Super • Main Counter', date = 'Today' } = req.query;
        const { key, slots } = await getStoreSlots(storeName);
        const calculatedSlots = await formatSlotsWithOrders(slots, key);

        res.json({
            success: true,
            storeName: key,
            date,
            slots: calculatedSlots
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 2. Shop Owner Update Slot (Time, Capacity, Block Status) - Individual Slot targeting
exports.updateSlotCapacity = async (req, res) => {
    try {
        const { storeName = 'PickFresh Super • Main Counter', slotId, capacity, time, duration, isBlocked } = req.body;

        if (!slotId) {
            return res.status(400).json({ success: false, message: 'slotId parameter is required' });
        }

        const { key, slots } = await getStoreSlots(storeName);

        // Find index matching slot.id OR slot._id strictly
        const slotIndex = slots.findIndex(s => {
            const sId = s.id || (s._id ? String(s._id) : null);
            return sId === String(slotId) || (s._id && String(s._id) === String(slotId));
        });

        if (slotIndex !== -1) {
            if (capacity !== undefined && capacity !== '') slots[slotIndex].capacity = Number(capacity);
            if (time) {
                slots[slotIndex].time = time;
                slots[slotIndex].duration = duration || `${time} - Next Slot`;
            }
            if (isBlocked !== undefined) slots[slotIndex].isBlocked = Boolean(isBlocked);

            if (!slots[slotIndex].id) {
                slots[slotIndex].id = String(slotId);
            }
        } else {
            console.warn(`Slot ID ${slotId} not found for store ${key}. No slots updated.`);
        }

        await saveStoreSlots(key, slots);
        const formattedSlots = await formatSlotsWithOrders(slots, key);

        res.json({
            success: true,
            message: 'Slot details updated successfully',
            updatedSlots: formattedSlots,
            slots: formattedSlots
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Add New Slot for Shop Owner
exports.addNewSlot = async (req, res) => {
    try {
        const { storeName = 'PickFresh Super • Main Counter', time, duration, capacity = 10 } = req.body;

        const { key, slots } = await getStoreSlots(storeName);

        const newTime = time || '6:00 PM';
        const newSlot = {
            id: `slot_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            time: newTime,
            duration: duration || `${newTime} - Next Slot`,
            capacity: Number(capacity) || 10,
            isBlocked: false
        };

        slots.push(newSlot);
        await saveStoreSlots(key, slots);
        const formattedSlots = await formatSlotsWithOrders(slots, key);

        res.json({
            success: true,
            message: 'New time slot added successfully',
            newSlot,
            updatedSlots: formattedSlots,
            slots: formattedSlots
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete Slot for Shop Owner - Individual Slot targeting
exports.deleteSlot = async (req, res) => {
    try {
        const { storeName = 'PickFresh Super • Main Counter', slotId } = req.body;

        if (!slotId) {
            return res.status(400).json({ success: false, message: 'slotId parameter is required' });
        }

        const { key, slots } = await getStoreSlots(storeName);
        const filteredSlots = slots.filter(s => {
            const sId = s.id || (s._id ? String(s._id) : null);
            return sId !== String(slotId) && String(s._id) !== String(slotId);
        });

        await saveStoreSlots(key, filteredSlots);
        const formattedSlots = await formatSlotsWithOrders(filteredSlots, key);

        res.json({
            success: true,
            message: 'Slot deleted successfully',
            updatedSlots: formattedSlots,
            slots: formattedSlots
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 3. Get Order Dashboard & List
exports.getOrders = async (req, res) => {
    try {
        const dbOrders = await Order.find().sort({ createdAt: -1 });
        return res.json({ success: true, count: dbOrders.length, orders: dbOrders });
    } catch (err) {
        return res.json({ success: true, count: 0, orders: [] });
    }
};

// 4. Get Single Order Details
exports.getOrderDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const cleanId = String(id).replace('#', '').trim();
        let order = null;
        if (mongoose.Types.ObjectId.isValid(id)) {
            order = await Order.findById(id);
        }
        if (!order) {
            order = await Order.findOne({
                $or: [
                    { orderNumber: id },
                    { orderNumber: `#${cleanId}` },
                    { orderNumber: cleanId },
                    { orderNumber: new RegExp(`^#?${cleanId}$`, 'i') }
                ]
            });
        }
        if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
        return res.json({ success: true, order });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// 5. Update Order Status
exports.updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, note, notifyCustomer, cancellationReason } = req.body;
        const cleanId = String(id).replace('#', '').trim();
        let order = null;
        if (mongoose.Types.ObjectId.isValid(id)) {
            order = await Order.findById(id);
        }
        if (!order) {
            order = await Order.findOne({
                $or: [
                    { orderNumber: id },
                    { orderNumber: `#${cleanId}` },
                    { orderNumber: cleanId },
                    { orderNumber: new RegExp(`^#?${cleanId}$`, 'i') }
                ]
            });
        }
        if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

        order.status = status;
        if (note) order.note = note;
        if (cancellationReason) order.cancellationReason = cancellationReason;
        await order.save();

        return res.json({
            success: true,
            message: `Order status updated to "${status}"`,
            notifiedCustomer: notifyCustomer,
            order
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// 6. Cancel Order API
exports.cancelOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const order = await Order.findById(id);
        if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

        order.status = 'Cancelled';
        order.cancellationReason = reason || 'Store cancelled';
        await order.save();

        return res.json({
            success: true,
            message: `Order ${id} has been cancelled`,
            order
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// 7. Get Pickup Schedule & Slot Congestion for Shop Owner Dashboard
exports.getPickupSchedule = async (req, res) => {
    try {
        const { storeName = 'PickFresh Super • Main Counter' } = req.query;
        const { key, slots } = await getStoreSlots(storeName);
        const scheduleSlots = await formatSlotsWithOrders(slots, key);

        return res.json({ success: true, storeName: key, slots: scheduleSlots });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

exports.matchSlotWithOrder = matchSlotWithOrder;
exports.formatSlotsWithOrders = formatSlotsWithOrders;
exports.getStoreSlots = getStoreSlots;

