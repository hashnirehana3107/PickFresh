const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'pickfresh_hci_milestone03_secret_key_2026');
            req.user = decoded;
            next();
        } catch (error) {
            return res.status(401).json({ success: false, message: 'Not authorized, token failed or expired' });
        }
    }

    if (!token) {
        return res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
    }
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `User role '${req.user ? req.user.role : 'none'}' is not authorized to access this route`
            });
        }
        next();
    };
};

module.exports = { protect, authorize };
