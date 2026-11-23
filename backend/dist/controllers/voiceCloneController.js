"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoiceCloneController = void 0;
const VoiceProfile_js_1 = require("../models/VoiceProfile.js");
const AIProvider_js_1 = require("../models/AIProvider.js");
const elevenlabsProvider_js_1 = require("../providers/elevenlabsProvider.js");
const crypto_js_1 = require("../utils/crypto.js");
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
class VoiceCloneController {
    static async listProfiles(req, res) {
        try {
            const query = req.user?.role === 'superadmin' ? {} : { userId: req.user?.userId };
            const profiles = await VoiceProfile_js_1.VoiceProfile.find(query).sort({ createdAt: -1 });
            return res.json({ success: true, profiles });
        }
        catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }
    static async createProfile(req, res) {
        try {
            const file = req.file;
            const { name, language = 'en', gender = 'neutral', provider = 'local', consentAgreed } = req.body;
            if (!file) {
                return res.status(400).json({ success: false, error: 'Voice audio sample is required' });
            }
            // Mandatory explicit consent check
            if (consentAgreed !== 'true' && consentAgreed !== true) {
                return res.status(400).json({
                    success: false,
                    error: 'Explicit authorization and consent is required for creating a voice profile',
                });
            }
            // Probe audio sample duration
            const duration = await new Promise((resolve) => {
                fluent_ffmpeg_1.default.ffprobe(file.path, (err, metadata) => {
                    resolve(metadata?.format?.duration || 0);
                });
            });
            let externalVoiceId = undefined;
            // If ElevenLabs is chosen and configured, register sample with ElevenLabs API
            if (provider === 'elevenlabs') {
                const prov = await AIProvider_js_1.AIProvider.findOne({ type: 'elevenlabs' });
                const apiKey = prov?.apiKeyEncrypted ? (0, crypto_js_1.decryptApiKey)(prov.apiKeyEncrypted) : process.env.ELEVENLABS_API_KEY;
                if (apiKey) {
                    try {
                        const elRes = await elevenlabsProvider_js_1.ElevenLabsProvider.cloneVoice({
                            apiKey,
                            name,
                            sampleFilePath: file.path,
                        });
                        externalVoiceId = elRes.voiceId;
                    }
                    catch (elErr) {
                        console.warn('ElevenLabs API clone error:', elErr.message);
                    }
                }
            }
            const profile = await VoiceProfile_js_1.VoiceProfile.create({
                userId: req.user?.userId,
                name,
                language,
                gender,
                samplePath: `/uploads/voices/${file.filename}`,
                sampleDuration: Math.round(duration),
                provider,
                voiceId: externalVoiceId || `local_clone_${Date.now()}`,
                consentAgreed: true,
                status: 'ready',
            });
            return res.status(201).json({ success: true, profile });
        }
        catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }
    static async deleteProfile(req, res) {
        try {
            const profile = await VoiceProfile_js_1.VoiceProfile.findById(req.params.id);
            if (!profile)
                return res.status(404).json({ success: false, error: 'Voice profile not found' });
            if (req.user?.role !== 'superadmin' && profile.userId.toString() !== req.user?.userId) {
                return res.status(403).json({ success: false, error: 'Access denied' });
            }
            await profile.deleteOne();
            return res.json({ success: true, message: 'Voice profile deleted' });
        }
        catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }
}
exports.VoiceCloneController = VoiceCloneController;
