"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderController = void 0;
const AIProvider_js_1 = require("../models/AIProvider.js");
const crypto_js_1 = require("../utils/crypto.js");
const openaiProvider_js_1 = require("../providers/openaiProvider.js");
const geminiProvider_js_1 = require("../providers/geminiProvider.js");
const elevenlabsProvider_js_1 = require("../providers/elevenlabsProvider.js");
class ProviderController {
    static async listProviders(req, res) {
        try {
            const providers = await AIProvider_js_1.AIProvider.find({});
            const sanitized = providers.map((p) => ({
                id: p._id,
                name: p.name,
                type: p.type,
                models: p.models,
                selectedModel: p.selectedModel,
                enabled: p.enabled,
                isDefault: p.isDefault,
                status: p.status,
                lastTestedAt: p.lastTestedAt,
                usageCount: p.usageCount,
                hasKey: !!p.apiKeyEncrypted,
                keyMasked: p.apiKeyEncrypted ? (0, crypto_js_1.maskApiKey)((0, crypto_js_1.decryptApiKey)(p.apiKeyEncrypted)) : '',
            }));
            return res.json({ success: true, providers: sanitized });
        }
        catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }
    static async updateProvider(req, res) {
        try {
            const { id } = req.params;
            const { apiKey, selectedModel, enabled, isDefault } = req.body;
            const provider = await AIProvider_js_1.AIProvider.findById(id);
            if (!provider)
                return res.status(404).json({ success: false, error: 'Provider not found' });
            if (apiKey !== undefined && apiKey.trim() !== '') {
                provider.apiKeyEncrypted = (0, crypto_js_1.encryptApiKey)(apiKey.trim());
                provider.status = 'online';
            }
            if (selectedModel)
                provider.selectedModel = selectedModel;
            if (enabled !== undefined)
                provider.enabled = enabled;
            if (isDefault !== undefined) {
                if (isDefault) {
                    await AIProvider_js_1.AIProvider.updateMany({ type: provider.type }, { isDefault: false });
                }
                provider.isDefault = isDefault;
            }
            await provider.save();
            return res.json({ success: true, message: 'Provider updated' });
        }
        catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }
    static async testProvider(req, res) {
        try {
            const { id } = req.params;
            const provider = await AIProvider_js_1.AIProvider.findById(id);
            if (!provider)
                return res.status(404).json({ success: false, error: 'Provider not found' });
            const rawKey = provider.apiKeyEncrypted ? (0, crypto_js_1.decryptApiKey)(provider.apiKeyEncrypted) : '';
            let testPassed = false;
            let errorMsg = '';
            try {
                if (provider.type === 'openai') {
                    if (!rawKey)
                        throw new Error('API key not configured');
                    testPassed = await openaiProvider_js_1.OpenAIProvider.testConnection(rawKey);
                }
                else if (provider.type === 'gemini') {
                    if (!rawKey)
                        throw new Error('API key not configured');
                    testPassed = await geminiProvider_js_1.GeminiProvider.testConnection(rawKey);
                }
                else if (provider.type === 'elevenlabs') {
                    if (!rawKey)
                        throw new Error('API key not configured');
                    testPassed = await elevenlabsProvider_js_1.ElevenLabsProvider.testConnection(rawKey);
                }
                else if (provider.type === 'whisper' || provider.type === 'edge-tts' || provider.type === 'local') {
                    testPassed = true;
                }
            }
            catch (e) {
                errorMsg = e.response?.data?.error?.message || e.message;
                testPassed = false;
            }
            provider.lastTestedAt = new Date();
            provider.status = testPassed ? 'online' : 'error';
            await provider.save();
            return res.json({
                success: testPassed,
                status: provider.status,
                message: testPassed ? 'Connection verified successfully!' : `Connection failed: ${errorMsg}`,
            });
        }
        catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }
}
exports.ProviderController = ProviderController;
