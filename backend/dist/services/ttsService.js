"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TtsService = void 0;
const path_1 = __importDefault(require("path"));
const edgeTtsProvider_js_1 = require("../providers/edgeTtsProvider.js");
const openaiProvider_js_1 = require("../providers/openaiProvider.js");
const elevenlabsProvider_js_1 = require("../providers/elevenlabsProvider.js");
const storageService_js_1 = require("./storageService.js");
const AIProvider_js_1 = require("../models/AIProvider.js");
const crypto_js_1 = require("../utils/crypto.js");
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
class TtsService {
    /**
     * Synthesize audio file for text segment or full text
     */
    static async synthesizeSpeech(params) {
        const { text, targetLang, voiceId, gender = 'female', providerType = 'edge-tts', rate = '+0%', pitch = '+0Hz', filenamePrefix = 'tts', } = params;
        const filename = `${filenamePrefix}_${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`;
        const audioDir = storageService_js_1.storageService.getDirectory('audio');
        const outputPath = path_1.default.join(audioDir, filename);
        if (providerType === 'openai') {
            const providerDoc = await AIProvider_js_1.AIProvider.findOne({ type: 'openai' });
            const apiKey = providerDoc?.apiKeyEncrypted ? (0, crypto_js_1.decryptApiKey)(providerDoc.apiKeyEncrypted) : process.env.OPENAI_API_KEY;
            if (!apiKey)
                throw new Error('OpenAI API Key is not configured');
            await openaiProvider_js_1.OpenAIProvider.generateSpeech({
                apiKey,
                text,
                voice: voiceId || 'nova',
                outputPath,
            });
        }
        else if (providerType === 'elevenlabs') {
            const providerDoc = await AIProvider_js_1.AIProvider.findOne({ type: 'elevenlabs' });
            const apiKey = providerDoc?.apiKeyEncrypted ? (0, crypto_js_1.decryptApiKey)(providerDoc.apiKeyEncrypted) : process.env.ELEVENLABS_API_KEY;
            if (!apiKey)
                throw new Error('ElevenLabs API Key is not configured');
            await elevenlabsProvider_js_1.ElevenLabsProvider.generateSpeech({
                apiKey,
                text,
                voiceId: voiceId || '21m00Tcm4TlvDq8ikWAM', // default Rachel
                outputPath,
            });
        }
        else {
            // Default: Edge TTS (multilingual, zero external key required)
            const selectedVoice = voiceId || edgeTtsProvider_js_1.EdgeTtsProvider.getDefaultVoice(targetLang, gender);
            await edgeTtsProvider_js_1.EdgeTtsProvider.generateAudio({
                text,
                outputPath,
                voice: selectedVoice,
                rate,
                pitch,
            });
        }
        // Probe duration
        const duration = await this.getAudioDuration(outputPath);
        return {
            filename,
            filePath: outputPath,
            duration,
        };
    }
    /**
     * Synthesize and assemble multilingual audio for all subtitle segments
     */
    static async synthesizeSubtitlesToTrack(params) {
        const { segments, targetLang, voiceId, gender = 'female', providerType = 'edge-tts', totalVideoDuration, outputFilename, onProgress, } = params;
        const tempDir = storageService_js_1.storageService.getDirectory('temp');
        const segmentAudioFiles = [];
        // 1. Generate audio for each segment
        for (let i = 0; i < segments.length; i++) {
            const seg = segments[i];
            if (onProgress) {
                const percent = Math.round((i / segments.length) * 70);
                onProgress(percent, `Generating AI voice for segment ${i + 1}/${segments.length}...`);
            }
            if (!seg.text.trim())
                continue;
            const segFilename = `seg_${i}_${Date.now()}.mp3`;
            const segPath = path_1.default.join(tempDir, segFilename);
            try {
                const selectedVoice = voiceId || edgeTtsProvider_js_1.EdgeTtsProvider.getDefaultVoice(targetLang, gender);
                await edgeTtsProvider_js_1.EdgeTtsProvider.generateAudio({
                    text: seg.text,
                    outputPath: segPath,
                    voice: selectedVoice,
                });
                const duration = await this.getAudioDuration(segPath);
                segmentAudioFiles.push({
                    path: segPath,
                    start: seg.start,
                    end: seg.end,
                    duration,
                });
            }
            catch (err) {
                console.warn(`Failed to synthesize segment ${i + 1}:`, err);
            }
        }
        if (onProgress) {
            onProgress(75, 'Assembling synchronized full dubbed audio track...');
        }
        // 2. Mix into continuous audio track with silence padding to match video timeline
        const audioDir = storageService_js_1.storageService.getDirectory('audio');
        const finalTrackPath = path_1.default.join(audioDir, outputFilename);
        await this.assembleTimelineAudio({
            audioFiles: segmentAudioFiles,
            totalDuration: totalVideoDuration,
            outputPath: finalTrackPath,
        });
        // Cleanup temp segment files
        for (const item of segmentAudioFiles) {
            storageService_js_1.storageService.deleteFile(item.path);
        }
        const duration = await this.getAudioDuration(finalTrackPath);
        return {
            filename: outputFilename,
            filePath: finalTrackPath,
            duration,
        };
    }
    static async getAudioDuration(filePath) {
        return new Promise((resolve) => {
            fluent_ffmpeg_1.default.ffprobe(filePath, (err, metadata) => {
                if (err || !metadata.format.duration)
                    return resolve(0);
                resolve(Number(metadata.format.duration));
            });
        });
    }
    /**
     * Build complete time-synchronized audio track using FFmpeg filter_complex
     */
    static async assembleTimelineAudio(params) {
        const { audioFiles, totalDuration, outputPath } = params;
        return new Promise((resolve, reject) => {
            if (audioFiles.length === 0) {
                // Generate blank silence if no segments
                (0, fluent_ffmpeg_1.default)()
                    .input(`anullsrc=r=44100:cl=stereo`)
                    .inputFormat('lavfi')
                    .duration(Math.max(1, totalDuration))
                    .output(outputPath)
                    .on('end', () => resolve(outputPath))
                    .on('error', (e) => reject(e))
                    .run();
                return;
            }
            let cmd = (0, fluent_ffmpeg_1.default)();
            // Input 0: base silence of video duration
            cmd.input(`anullsrc=r=44100:cl=stereo`).inputFormat('lavfi').duration(Math.max(1, totalDuration));
            const filterParts = [];
            const amixInputs = ['[0:a]'];
            audioFiles.forEach((file, index) => {
                cmd.input(file.path);
                const inputIdx = index + 1;
                const delayMs = Math.round(file.start * 1000);
                const delayedTag = `[d${index}]`;
                filterParts.push(`[${inputIdx}:a]adelay=${delayMs}|${delayMs}${delayedTag}`);
                amixInputs.push(delayedTag);
            });
            filterParts.push(`${amixInputs.join('')}amix=inputs=${amixInputs.length}:dropout_transition=0:normalize=0[aout]`);
            cmd
                .complexFilter(filterParts)
                .map('[aout]')
                .audioCodec('libmp3lame')
                .audioBitrate(192)
                .output(outputPath)
                .on('end', () => resolve(outputPath))
                .on('error', (err) => reject(err))
                .run();
        });
    }
}
exports.TtsService = TtsService;
