"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTokens = generateTokens;
exports.verifyAccessToken = verifyAccessToken;
exports.verifyRefreshToken = verifyRefreshToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_js_1 = require("../config/env.js");
function generateTokens(payload) {
    const accessToken = jsonwebtoken_1.default.sign(payload, env_js_1.config.JWT_SECRET, {
        expiresIn: 86400, // 1 day
    });
    const refreshToken = jsonwebtoken_1.default.sign(payload, env_js_1.config.JWT_REFRESH_SECRET, {
        expiresIn: 604800, // 7 days
    });
    return { accessToken, refreshToken };
}
function verifyAccessToken(token) {
    try {
        return jsonwebtoken_1.default.verify(token, env_js_1.config.JWT_SECRET);
    }
    catch {
        return null;
    }
}
function verifyRefreshToken(token) {
    try {
        return jsonwebtoken_1.default.verify(token, env_js_1.config.JWT_REFRESH_SECRET);
    }
    catch {
        return null;
    }
}
