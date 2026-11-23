"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.disconnectDatabase = exports.connectDatabase = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const env_js_1 = require("./env.js");
let mongod = null;
const connectDatabase = async () => {
    try {
        // Set connection options with 3-second timeout for local server check
        await mongoose_1.default.connect(env_js_1.config.MONGODB_URI, {
            serverSelectionTimeoutMS: 3000,
        });
        console.log(`[Database] Connected to external MongoDB at ${env_js_1.config.MONGODB_URI}`);
    }
    catch (err) {
        console.warn(`[Database] Could not connect to external MongoDB: ${err.message}`);
        console.log(`[Database] Initializing embedded MongoDB server for zero-setup execution...`);
        try {
            const { MongoMemoryServer } = await import('mongodb-memory-server');
            mongod = await MongoMemoryServer.create();
            const uri = mongod.getUri();
            await mongoose_1.default.connect(uri);
            console.log(`[Database] Embedded MongoDB Memory Server started successfully at ${uri}`);
        }
        catch (memErr) {
            console.error(`[Database] Failed to start embedded MongoDB: ${memErr.message}`);
            throw memErr;
        }
    }
    // Seed default AI Providers and Superadmin if not exists
    await seedInitialData();
};
exports.connectDatabase = connectDatabase;
const disconnectDatabase = async () => {
    await mongoose_1.default.disconnect();
    if (mongod) {
        await mongod.stop();
    }
};
exports.disconnectDatabase = disconnectDatabase;
async function seedInitialData() {
    try {
        const { User } = await import('../models/User.js');
        const { AIProvider } = await import('../models/AIProvider.js');
        const bcrypt = (await import('bcryptjs')).default;
        // Seed default admin
        const adminExists = await User.findOne({ email: 'admin@videotranslator.ai' });
        if (!adminExists) {
            const hashedPassword = await bcrypt.hash('Admin@123456', 10);
            await User.create({
                name: 'Super Admin',
                email: 'admin@videotranslator.ai',
                password: hashedPassword,
                role: 'superadmin',
                isActive: true,
            });
            console.log('[Seed] Superadmin created: admin@videotranslator.ai / Admin@123456');
        }
        // Seed standard AI providers
        const providers = [
            {
                name: 'Faster Whisper (Local)',
                type: 'whisper',
                models: ['tiny', 'base', 'small', 'medium', 'large-v3'],
                selectedModel: 'base',
                enabled: true,
                isDefault: true,
                status: 'online',
            },
            {
                name: 'Edge TTS (Multilingual)',
                type: 'edge-tts',
                models: ['neural-v2'],
                selectedModel: 'neural-v2',
                enabled: true,
                isDefault: true,
                status: 'online',
            },
            {
                name: 'OpenAI API',
                type: 'openai',
                models: ['gpt-4o', 'gpt-4o-mini', 'whisper-1', 'tts-1', 'tts-1-hd'],
                selectedModel: 'gpt-4o-mini',
                enabled: true,
                isDefault: false,
                status: 'unconfigured',
            },
            {
                name: 'Google Gemini API',
                type: 'gemini',
                models: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash'],
                selectedModel: 'gemini-1.5-flash',
                enabled: true,
                isDefault: true,
                status: 'unconfigured',
            },
            {
                name: 'ElevenLabs',
                type: 'elevenlabs',
                models: ['eleven_multilingual_v2', 'eleven_turbo_v2'],
                selectedModel: 'eleven_multilingual_v2',
                enabled: true,
                isDefault: false,
                status: 'unconfigured',
            },
            {
                name: 'Local AI Adapter',
                type: 'local',
                models: ['local-transformer', 'ctranslate2'],
                selectedModel: 'local-transformer',
                enabled: true,
                isDefault: false,
                status: 'online',
            },
        ];
        for (const p of providers) {
            const exists = await AIProvider.findOne({ type: p.type });
            if (!exists) {
                await AIProvider.create(p);
            }
        }
    }
    catch (err) {
        console.error('[Seed] Error seeding initial data:', err.message);
    }
}
