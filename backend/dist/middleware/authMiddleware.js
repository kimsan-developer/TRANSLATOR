"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.requireRole = requireRole;
const jwt_js_1 = require("../utils/jwt.js");
function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'Authorization header with Bearer token is required' });
    }
    const token = authHeader.split(' ')[1];
    const payload = (0, jwt_js_1.verifyAccessToken)(token);
    if (!payload) {
        return res.status(401).json({ success: false, error: 'Invalid or expired access token' });
    }
    req.user = payload;
    next();
}
function requireRole(roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ success: false, error: 'Forbidden: Insufficient privileges' });
        }
        next();
    };
}
