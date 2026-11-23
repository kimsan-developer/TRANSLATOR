"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const User_js_1 = require("../models/User.js");
const jwt_js_1 = require("../utils/jwt.js");
class AuthController {
    static async register(req, res) {
        try {
            const { name, email, password } = req.body;
            if (!name || !email || !password) {
                return res.status(400).json({ success: false, error: 'Name, email, and password are required' });
            }
            const existing = await User_js_1.User.findOne({ email: email.toLowerCase() });
            if (existing) {
                return res.status(409).json({ success: false, error: 'A user with this email already exists' });
            }
            const hashedPassword = await bcryptjs_1.default.hash(password, 10);
            const user = await User_js_1.User.create({
                name,
                email: email.toLowerCase(),
                password: hashedPassword,
                role: 'user',
                isActive: true,
            });
            const tokens = (0, jwt_js_1.generateTokens)({
                userId: user._id.toString(),
                email: user.email,
                role: user.role,
            });
            return res.status(201).json({
                success: true,
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    avatar: user.avatar,
                },
                ...tokens,
            });
        }
        catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }
    static async login(req, res) {
        try {
            const { email, password } = req.body;
            if (!email || !password) {
                return res.status(400).json({ success: false, error: 'Email and password are required' });
            }
            const user = await User_js_1.User.findOne({ email: email.toLowerCase() });
            if (!user || !user.isActive) {
                return res.status(401).json({ success: false, error: 'Invalid credentials or inactive account' });
            }
            const isMatch = await bcryptjs_1.default.compare(password, user.password || '');
            if (!isMatch) {
                return res.status(401).json({ success: false, error: 'Invalid credentials' });
            }
            const tokens = (0, jwt_js_1.generateTokens)({
                userId: user._id.toString(),
                email: user.email,
                role: user.role,
            });
            return res.json({
                success: true,
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    avatar: user.avatar,
                },
                ...tokens,
            });
        }
        catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }
    static async refresh(req, res) {
        try {
            const { refreshToken } = req.body;
            if (!refreshToken) {
                return res.status(400).json({ success: false, error: 'Refresh token is required' });
            }
            const payload = (0, jwt_js_1.verifyRefreshToken)(refreshToken);
            if (!payload) {
                return res.status(401).json({ success: false, error: 'Invalid or expired refresh token' });
            }
            const user = await User_js_1.User.findById(payload.userId);
            if (!user || !user.isActive) {
                return res.status(401).json({ success: false, error: 'User no longer active' });
            }
            const tokens = (0, jwt_js_1.generateTokens)({
                userId: user._id.toString(),
                email: user.email,
                role: user.role,
            });
            return res.json({ success: true, ...tokens });
        }
        catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }
    static async me(req, res) {
        try {
            const user = await User_js_1.User.findById(req.user?.userId).select('-password');
            if (!user) {
                return res.status(404).json({ success: false, error: 'User not found' });
            }
            return res.json({ success: true, user });
        }
        catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }
    static async updateProfile(req, res) {
        try {
            const { name, avatar, preferences } = req.body;
            const user = await User_js_1.User.findById(req.user?.userId);
            if (!user)
                return res.status(404).json({ success: false, error: 'User not found' });
            if (name)
                user.name = name;
            if (avatar !== undefined)
                user.avatar = avatar;
            if (preferences)
                user.preferences = { ...user.preferences, ...preferences };
            await user.save();
            return res.json({ success: true, user });
        }
        catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }
    static async forgotPassword(req, res) {
        // Standard mock or reset link token issuance
        const { email } = req.body;
        return res.json({
            success: true,
            message: `Password reset instructions have been dispatched to ${email}`,
        });
    }
}
exports.AuthController = AuthController;
