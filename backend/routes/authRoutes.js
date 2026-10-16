const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getProfile, socialLoginUser, updateProfile, getUserDetails, deactivateAccount } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/social-login', socialLoginUser);
router.get('/profile', protect, getProfile);
router.get('/user-details', getUserDetails);
router.put('/update-profile', updateProfile);
router.post('/deactivate-account', deactivateAccount);

module.exports = router;
