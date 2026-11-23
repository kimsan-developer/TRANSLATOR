"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ElevenLabsProvider = void 0;
const axios_1 = __importDefault(require("axios"));
const fs_1 = __importDefault(require("fs"));
const form_data_1 = __importDefault(require("form-data"));
class ElevenLabsProvider {
    /**
     * Synthesize speech using ElevenLabs API
     */
    static async generateSpeech(params) {
        const { apiKey, text, voiceId, outputPath, modelId = 'eleven_multilingual_v2' } = params;
        const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
        const response = await axios_1.default.post(url, {
            text,
            model_id: modelId,
            voice_settings: {
                stability: 0.5,
                similarity_boost: 0.75,
            },
        }, {
            headers: {
                'xi-api-key': apiKey,
                'Content-Type': 'application/json',
            },
            responseType: 'arraybuffer',
            timeout: 60000,
        });
        fs_1.default.writeFileSync(outputPath, Buffer.from(response.data));
        return outputPath;
    }
    /**
     * Add / Clone a new voice profile using voice audio sample
     */
    static async cloneVoice(params) {
        const { apiKey, name, sampleFilePath, description = 'Voice cloned in Video Translator AI Pro' } = params;
        const form = new form_data_1.default();
        form.append('name', name);
        form.append('description', description);
        form.append('files', fs_1.default.createReadStream(sampleFilePath));
        const response = await axios_1.default.post('https://api.elevenlabs.io/v1/voices/add', form, {
            headers: {
                'xi-api-key': apiKey,
                ...form.getHeaders(),
            },
            timeout: 60000,
        });
        return {
            voiceId: response.data.voice_id,
            name,
        };
    }
    /**
     * Connection test
     */
    static async testConnection(apiKey) {
        const res = await axios_1.default.get('https://api.elevenlabs.io/v1/user', {
            headers: { 'xi-api-key': apiKey },
            timeout: 10000,
        });
        return res.status === 200;
    }
}
exports.ElevenLabsProvider = ElevenLabsProvider;
