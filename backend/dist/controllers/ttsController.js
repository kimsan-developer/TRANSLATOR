"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TtsController = void 0;
const Project_js_1 = require("../models/Project.js");
const Subtitle_js_1 = require("../models/Subtitle.js");
const ttsService_js_1 = require("../services/ttsService.js");
const jobQueue_js_1 = require("../queues/jobQueue.js");
class TtsController {
    static async listVoices(req, res) {
        try {
            const voiceList = [
                { id: 'en-US-JennyNeural', name: 'Jenny (US)', gender: 'female', lang: 'en', provider: 'edge-tts' },
                { id: 'en-US-ChristopherNeural', name: 'Christopher (US)', gender: 'male', lang: 'en', provider: 'edge-tts' },
                { id: 'km-KH-PisethNeural', name: 'Piseth (Khmer)', gender: 'male', lang: 'km', provider: 'edge-tts' },
                { id: 'km-KH-SreymomNeural', name: 'Sreymom (Khmer)', gender: 'female', lang: 'km', provider: 'edge-tts' },
                { id: 'th-TH-PremwadeeNeural', name: 'Premwadee (Thai)', gender: 'female', lang: 'th', provider: 'edge-tts' },
                { id: 'th-TH-NiwatNeural', name: 'Niwat (Thai)', gender: 'male', lang: 'th', provider: 'edge-tts' },
                { id: 'vi-VN-HoaiMyNeural', name: 'Hoai My (Vietnamese)', gender: 'female', lang: 'vi', provider: 'edge-tts' },
                { id: 'vi-VN-NamMinhNeural', name: 'Nam Minh (Vietnamese)', gender: 'male', lang: 'vi', provider: 'edge-tts' },
                { id: 'zh-CN-XiaoxiaoNeural', name: 'Xiaoxiao (Chinese)', gender: 'female', lang: 'zh', provider: 'edge-tts' },
                { id: 'zh-CN-YunxiNeural', name: 'Yunxi (Chinese)', gender: 'male', lang: 'zh', provider: 'edge-tts' },
                { id: 'ja-JP-NanamiNeural', name: 'Nanami (Japanese)', gender: 'female', lang: 'ja', provider: 'edge-tts' },
                { id: 'ja-JP-KeitaNeural', name: 'Keita (Japanese)', gender: 'male', lang: 'ja', provider: 'edge-tts' },
                { id: 'fr-FR-DeniseNeural', name: 'Denise (French)', gender: 'female', lang: 'fr', provider: 'edge-tts' },
                { id: 'es-ES-ElviraNeural', name: 'Elvira (Spanish)', gender: 'female', lang: 'es', provider: 'edge-tts' },
                { id: 'de-DE-KatjaNeural', name: 'Katja (German)', gender: 'female', lang: 'de', provider: 'edge-tts' },
                { id: 'nova', name: 'OpenAI Nova', gender: 'female', lang: 'multilingual', provider: 'openai' },
                { id: 'alloy', name: 'OpenAI Alloy', gender: 'neutral', lang: 'multilingual', provider: 'openai' },
                { id: '21m00Tcm4TlvDq8ikWAM', name: 'ElevenLabs Rachel', gender: 'female', lang: 'en', provider: 'elevenlabs' },
            ];
            return res.json({ success: true, voices: voiceList });
        }
        catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }
    static async previewVoice(req, res) {
        try {
            const { text = 'Hello, this is a live AI voice preview from Video Translator AI Pro.', voiceId, targetLang = 'en', provider = 'edge-tts' } = req.body;
            const result = await ttsService_js_1.TtsService.synthesizeSpeech({
                text,
                targetLang,
                voiceId,
                providerType: provider,
                filenamePrefix: 'preview',
            });
            return res.json({
                success: true,
                audioUrl: `/uploads/audio/${result.filename}`,
                duration: result.duration,
            });
        }
        catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }
    static async generateDubbing(req, res) {
        try {
            const { projectId, voiceId, gender = 'female', provider = 'edge-tts' } = req.body;
            if (!projectId)
                return res.status(400).json({ success: false, error: 'projectId is required' });
            const project = await Project_js_1.Project.findById(projectId);
            if (!project)
                return res.status(404).json({ success: false, error: 'Project not found' });
            const translatedSub = await Subtitle_js_1.Subtitle.findOne({ projectId: project._id, type: 'translated' });
            if (!translatedSub || translatedSub.segments.length === 0) {
                return res.status(400).json({ success: false, error: 'No translated subtitles found to synthesize' });
            }
            const job = await jobQueue_js_1.jobQueue.addJob({
                projectId: project._id,
                userId: req.user?.userId,
                type: 'tts',
                metadata: {
                    targetLanguage: project.targetLanguage,
                    voiceId,
                    gender,
                    provider,
                },
            });
            return res.status(202).json({
                success: true,
                message: 'AI Voice synthesis queued in background worker',
                jobId: job._id,
            });
        }
        catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }
}
exports.TtsController = TtsController;
