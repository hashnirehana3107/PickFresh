const express = require('express');
const router = express.Router();
const {
    getSupplierAlerts,
    createSupplierAlert,
    updateSupplierAlertStatus
} = require('../controllers/supplierController');

router.get('/alerts', getSupplierAlerts);
router.post('/alerts', createSupplierAlert);
router.put('/alerts/:id/status', updateSupplierAlertStatus);

module.exports = router;
