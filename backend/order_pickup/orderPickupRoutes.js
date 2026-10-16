const express = require('express');
const router = express.Router();
const {
    getOrders,
    getOrderDetails,
    updateOrderStatus,
    cancelOrder,
    getPickupSchedule,
    getAvailableSlots,
    updateSlotCapacity,
    addNewSlot,
    deleteSlot
} = require('./orderPickupController');

// 1. Order Dashboard List
router.get('/orders', getOrders);

// 2. Order Details
router.get('/orders/:id', getOrderDetails);

// 3. Status Update
router.put('/orders/:id/status', updateOrderStatus);

// 4. Cancel Order
router.put('/orders/:id/cancel', cancelOrder);

// 5. Pickup Schedule
router.get('/schedule', getPickupSchedule);

// 6. Available Time Slots for Customer Pickup Selection
router.get('/slots', getAvailableSlots);

// 7. Update Slot Capacity / Time / Status for Shop Owner
router.put('/slots/capacity', updateSlotCapacity);

// 8. Add New Time Slot for Shop Owner
router.post('/slots/add', addNewSlot);

// 9. Delete Time Slot for Shop Owner (supports POST & DELETE)
router.post('/slots/delete', deleteSlot);
router.delete('/slots/delete', deleteSlot);

module.exports = router;




