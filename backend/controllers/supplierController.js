const SupplierAlert = require('../models/SupplierAlert');

const seedAlerts = [
    {
        productName: 'Coca-Cola 1.5L',
        supplierName: 'ABS Distributors',
        currentStock: 4,
        suggestedReorderQuantity: 20,
        status: 'Low Stock Alert',
        estimatedDelivery: 'Tomorrow, 10:30 AM'
    },
    {
        productName: 'Anchor Full Cream Milk 400g',
        supplierName: 'Fonterra Brands Lanka',
        currentStock: 0,
        suggestedReorderQuantity: 30,
        status: 'Restock Requested',
        estimatedDelivery: 'Tomorrow, 2:00 PM'
    }
];

// @desc Get all supplier alerts & requests (FR07, FR08)
// @route GET /api/suppliers/alerts
exports.getSupplierAlerts = async (req, res) => {
    try {
        let alerts = await SupplierAlert.find().sort({ createdAt: -1 });
        if (alerts.length === 0) {
            alerts = await SupplierAlert.insertMany(seedAlerts);
        }
        res.json({ success: true, count: alerts.length, alerts });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc Create restock request (FR07, FR08 - CRUD Create)
// @route POST /api/suppliers/alerts
exports.createSupplierAlert = async (req, res) => {
    try {
        const { productName, supplierName, currentStock, suggestedReorderQuantity, estimatedDelivery } = req.body;
        const alert = await SupplierAlert.create({
            productName,
            supplierName: supplierName || 'ABS Distributors',
            currentStock: Number(currentStock) || 0,
            suggestedReorderQuantity: Number(suggestedReorderQuantity) || 20,
            status: 'Restock Requested',
            estimatedDelivery: estimatedDelivery || 'Tomorrow, 10:30 AM'
        });
        res.status(201).json({ success: true, message: 'Restock request sent to supplier', alert });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc Update delivery status (FR08 - CRUD Update)
// @route PUT /api/suppliers/alerts/:id/status
exports.updateSupplierAlertStatus = async (req, res) => {
    try {
        const { status } = req.body;
        let alert = null;
        if (/^[0-9a-fA-F]{24}$/.test(req.params.id)) {
            try { alert = await SupplierAlert.findById(req.params.id); } catch (e) { }
        }
        if (!alert) {
            alert = await SupplierAlert.findOne({});
        }
        if (!alert) {
            return res.status(404).json({ success: false, message: 'Alert not found' });
        }
        alert.status = status;
        await alert.save();
        res.json({ success: true, message: `Supplier alert status updated to '${status}'`, alert });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
