"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptApiKey = encryptApiKey;
exports.decryptApiKey = decryptApiKey;
exports.maskApiKey = maskApiKey;
const crypto_1 = __importDefault(require("crypto"));
const env_js_1 = require("../config/env.js");
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;
function encryptApiKey(text) {
    if (!text)
        return '';
    const iv = crypto_1.default.randomBytes(IV_LENGTH);
    const key = Buffer.from(env_js_1.config.ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32));
    const cipher = crypto_1.default.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
}
function decryptApiKey(encryptedText) {
    if (!encryptedText || !encryptedText.includes(':'))
        return '';
    try {
        const [ivHex, encryptedData] = encryptedText.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const key = Buffer.from(env_js_1.config.ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32));
        const decipher = crypto_1.default.createDecipheriv(ALGORITHM, key, iv);
        let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    catch {
        return '';
    }
}
function maskApiKey(key) {
    if (!key)
        return '';
    if (key.length <= 8)
        return '****';
    return `${key.slice(0, 4)}...${key.slice(-4)}`;
}
