"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const apiRoutes_js_1 = __importDefault(require("./routes/apiRoutes.js"));
const errorMiddleware_js_1 = require("./middleware/errorMiddleware.js");
const env_js_1 = require("./config/env.js");
const app = (0, express_1.default)();
// Middlewares
app.use((0, cors_1.default)({
    origin: true,
    credentials: true,
}));
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
// Static file serving for media assets
app.use('/uploads', express_1.default.static(env_js_1.config.STORAGE_DIR));
// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        name: 'VIDEO TRANSLATOR AI PRO API',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
    });
});
// API Routes
app.use('/api', apiRoutes_js_1.default);
// Production Frontend Static Serving
const frontendDist = path_1.default.resolve(__dirname, '../../frontend/dist');
app.use(express_1.default.static(frontendDist));
app.get('*', (req, res, next) => {
    if (req.url.startsWith('/api') || req.url.startsWith('/uploads')) {
        return next();
    }
    const indexPath = path_1.default.join(frontendDist, 'index.html');
    res.sendFile(indexPath, (err) => {
        if (err)
            next();
    });
});
// Global Error Handler
app.use(errorMiddleware_js_1.errorHandler);
exports.default = app;
