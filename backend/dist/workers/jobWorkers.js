"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAllJobWorkers = registerAllJobWorkers;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const jobQueue_js_1 = require("../queues/jobQueue.js");
const ffmpegService_js_1 = require("../services/ffmpegService.js");
const storageService_js_1 = require("../services/storageService.js");
const whisperProvider_js_1 = require("../providers/whisperProvider.js");
const openaiProvider_js_1 = require("../providers/openaiProvider.js");
const geminiProvider_js_1 = require("../providers/geminiProvider.js");
const localProvider_js_1 = require("../providers/localProvider.js");
const ttsService_js_1 = require("../services/ttsService.js");
const Project_js_1 = require("../models/Project.js");
const Video_js_1 = require("../models/Video.js");
const Audio_js_1 = require("../models/Audio.js");
const Subtitle_js_1 = require("../models/Subtitle.js");
const Translation_js_1 = require("../models/Translation.js");
const ExportJob_js_1 = require("../models/ExportJob.js");
const UsageRecord_js_1 = require("../models/UsageRecord.js");
const AIProvider_js_1 = require("../models/AIProvider.js");
const crypto_js_1 = require("../utils/crypto.js");
const srtParser_js_1 = require("../utils/srtParser.js");
function registerAllJobWorkers() {
    /**
     * 1. TRANSCRIPTION WORKER
     */
    jobQueue_js_1.jobQueue.registerWorker('transcription', async (job, updateProgress, isCancelled) => {
        await updateProgress(5, 'Extracting audio track from video...');
        const project = await Project_js_1.Project.findById(job.projectId);
        if (!project)
            throw new Error('Project not found');
        const video = await Video_js_1.Video.findOne({ projectId: project._id });
        if (!video)
            throw new Error('Video not found');
        const audioFilename = `audio_${Date.now()}_${path_1.default.parse(video.filename).name}.wav`;
        const audioTrackPath = await ffmpegService_js_1.ffmpegService.extractAudioForTranscription(video.path, audioFilename);
        if (isCancelled())
            return;
        // Save extracted audio record
        await Audio_js_1.Audio.create({
            projectId: project._id,
            userId: job.userId,
            type: 'extracted',
            filename: audioFilename,
            path: audioTrackPath,
            duration: video.duration,
            volume: 1.0,
            status: 'ready',
        });
        await updateProgress(25, 'Transcribing speech with AI model...');
        const lang = job.metadata?.language || 'auto';
        const model = job.metadata?.model || 'base';
        const provider = job.metadata?.provider || 'whisper';
        let segments = [];
        let detectedLang = lang;
        if (provider === 'openai') {
            const provDoc = await AIProvider_js_1.AIProvider.findOne({ type: 'openai' });
            const apiKey = provDoc?.apiKeyEncrypted ? (0, crypto_js_1.decryptApiKey)(provDoc.apiKeyEncrypted) : process.env.OPENAI_API_KEY;
            if (!apiKey)
                throw new Error('OpenAI API key not configured');
            const whisperRes = await openaiProvider_js_1.OpenAIProvider.transcribeAudio({
                apiKey,
                audioFilePath: audioTrackPath,
                language: lang !== 'auto' ? lang : undefined,
            });
            segments = whisperRes.segments;
        }
        else {
            // Faster-Whisper
            const whisperRes = await whisperProvider_js_1.WhisperProvider.transcribe({
                audioPath: audioTrackPath,
                language: lang,
                model,
                onProgress: (step) => updateProgress(40, step),
            });
            segments = whisperRes.segments;
            detectedLang = whisperRes.detected_language;
        }
        if (isCancelled())
            return;
        await updateProgress(85, 'Saving subtitle segments...');
        // Save Subtitle record
        let originalSub = await Subtitle_js_1.Subtitle.findOne({ projectId: project._id, type: 'original' });
        if (!originalSub) {
            originalSub = await Subtitle_js_1.Subtitle.create({
                projectId: project._id,
                userId: job.userId,
                language: detectedLang,
                type: 'original',
                format: 'srt',
                segments,
            });
        }
        else {
            originalSub.language = detectedLang;
            originalSub.segments = segments;
            await originalSub.save();
        }
        project.originalSubtitleId = originalSub._id;
        project.sourceLanguage = detectedLang;
        project.status = 'uploaded';
        project.currentStep = 3; // Ready for translation
        await project.save();
        // Log usage
        await UsageRecord_js_1.UsageRecord.create({
            userId: job.userId,
            projectId: project._id,
            feature: 'transcription',
            provider: provider === 'openai' ? 'OpenAI Whisper API' : 'Faster-Whisper (Local)',
            durationSeconds: video.duration,
            costEstimate: provider === 'openai' ? (video.duration / 60) * 0.006 : 0,
            status: 'success',
        });
        await updateProgress(100, 'Transcription finished');
        return { segmentsCount: segments.length, detectedLanguage: detectedLang };
    });
    /**
     * 2. TRANSLATION WORKER
     */
    jobQueue_js_1.jobQueue.registerWorker('translation', async (job, updateProgress, isCancelled) => {
        await updateProgress(10, 'Preparing subtitle segments for translation...');
        const project = await Project_js_1.Project.findById(job.projectId);
        if (!project)
            throw new Error('Project not found');
        const originalSub = await Subtitle_js_1.Subtitle.findOne({ projectId: project._id, type: 'original' });
        if (!originalSub || originalSub.segments.length === 0) {
            throw new Error('Original subtitles not found or empty');
        }
        const { sourceLanguage, targetLanguage, provider = 'gemini', style = 'formal' } = job.metadata || {};
        await updateProgress(30, `Translating ${originalSub.segments.length} segments with ${provider.toUpperCase()}...`);
        let translatedResults = [];
        if (provider === 'openai') {
            const provDoc = await AIProvider_js_1.AIProvider.findOne({ type: 'openai' });
            const apiKey = provDoc?.apiKeyEncrypted ? (0, crypto_js_1.decryptApiKey)(provDoc.apiKeyEncrypted) : process.env.OPENAI_API_KEY;
            if (!apiKey)
                throw new Error('OpenAI API key not configured');
            translatedResults = await openaiProvider_js_1.OpenAIProvider.translateSegments({
                apiKey,
                segments: originalSub.segments,
                sourceLang: sourceLanguage,
                targetLang: targetLanguage,
                style,
            });
        }
        else if (provider === 'gemini') {
            const provDoc = await AIProvider_js_1.AIProvider.findOne({ type: 'gemini' });
            const apiKey = provDoc?.apiKeyEncrypted ? (0, crypto_js_1.decryptApiKey)(provDoc.apiKeyEncrypted) : process.env.GEMINI_API_KEY;
            if (apiKey) {
                translatedResults = await geminiProvider_js_1.GeminiProvider.translateSegments({
                    apiKey,
                    segments: originalSub.segments,
                    sourceLang: sourceLanguage,
                    targetLang: targetLanguage,
                    style,
                });
            }
            else {
                // Graceful fallback to local translation adapter
                await updateProgress(45, 'Gemini key not configured; using local translation adapter...');
                translatedResults = await localProvider_js_1.LocalProvider.translateSegments({
                    segments: originalSub.segments,
                    sourceLang: sourceLanguage,
                    targetLang: targetLanguage,
                });
            }
        }
        else {
            translatedResults = await localProvider_js_1.LocalProvider.translateSegments({
                segments: originalSub.segments,
                sourceLang: sourceLanguage,
                targetLang: targetLanguage,
            });
        }
        if (isCancelled())
            return;
        await updateProgress(80, 'Mapping translated subtitles...');
        const translationMap = new Map(translatedResults.map((r) => [r.segmentId, r.translatedText]));
        const translatedSegments = originalSub.segments.map((seg) => ({
            id: seg.id,
            start: seg.start,
            end: seg.end,
            text: translationMap.get(seg.id) || seg.text,
            originalText: seg.text,
            confidence: 0.98,
        }));
        let translatedSub = await Subtitle_js_1.Subtitle.findOne({ projectId: project._id, type: 'translated' });
        if (!translatedSub) {
            translatedSub = await Subtitle_js_1.Subtitle.create({
                projectId: project._id,
                userId: job.userId,
                language: targetLanguage,
                type: 'translated',
                format: 'srt',
                segments: translatedSegments,
            });
        }
        else {
            translatedSub.language = targetLanguage;
            translatedSub.segments = translatedSegments;
            await translatedSub.save();
        }
        project.translatedSubtitleId = translatedSub._id;
        project.status = 'translated';
        project.currentStep = 4; // Ready for dubbing
        await project.save();
        // Save translation log
        await Translation_js_1.Translation.create({
            projectId: project._id,
            userId: job.userId,
            sourceLanguage,
            targetLanguage,
            provider,
            style,
            status: 'completed',
            translatedSegments: translatedSegments.map((s) => ({
                segmentId: s.id,
                start: s.start,
                end: s.end,
                sourceText: s.originalText || '',
                translatedText: s.text,
            })),
        });
        const totalChars = originalSub.segments.reduce((acc, s) => acc + s.text.length, 0);
        await UsageRecord_js_1.UsageRecord.create({
            userId: job.userId,
            projectId: project._id,
            feature: 'translation',
            provider: `${provider.toUpperCase()} Translation`,
            characterCount: totalChars,
            costEstimate: (totalChars / 1000) * 0.0001,
            status: 'success',
        });
        await updateProgress(100, 'Translation finished');
        return { translatedCount: translatedSegments.length };
    });
    /**
     * 3. TTS DUBBING WORKER
     */
    jobQueue_js_1.jobQueue.registerWorker('tts', async (job, updateProgress, isCancelled) => {
        await updateProgress(5, 'Loading translated subtitles for dubbing...');
        const project = await Project_js_1.Project.findById(job.projectId);
        if (!project)
            throw new Error('Project not found');
        const video = await Video_js_1.Video.findOne({ projectId: project._id });
        if (!video)
            throw new Error('Video not found');
        const translatedSub = await Subtitle_js_1.Subtitle.findOne({ projectId: project._id, type: 'translated' });
        if (!translatedSub || translatedSub.segments.length === 0) {
            throw new Error('Translated subtitles not found');
        }
        const { targetLanguage, voiceId, gender = 'female', provider = 'edge-tts' } = job.metadata || {};
        const outputTrackName = `dubbed_${Date.now()}_${targetLanguage}.mp3`;
        const result = await ttsService_js_1.TtsService.synthesizeSubtitlesToTrack({
            segments: translatedSub.segments,
            targetLang: targetLanguage || project.targetLanguage,
            voiceId,
            gender,
            providerType: provider,
            totalVideoDuration: video.duration || 10,
            outputFilename: outputTrackName,
            onProgress: (p, msg) => updateProgress(p, msg),
        });
        if (isCancelled())
            return;
        // Save Audio track record
        await Audio_js_1.Audio.create({
            projectId: project._id,
            userId: job.userId,
            type: 'tts',
            filename: result.filename,
            path: result.filePath,
            duration: result.duration,
            language: targetLanguage,
            voiceId: voiceId || 'default',
            volume: 1.0,
            status: 'ready',
        });
        project.generatedAudioFile = `/uploads/audio/${result.filename}`;
        project.status = 'dubbed';
        project.currentStep = 5; // Ready for export
        await project.save();
        await UsageRecord_js_1.UsageRecord.create({
            userId: job.userId,
            projectId: project._id,
            feature: 'tts',
            provider: `${provider.toUpperCase()} TTS`,
            durationSeconds: result.duration,
            costEstimate: provider === 'elevenlabs' ? (result.duration / 60) * 0.05 : 0,
            status: 'success',
        });
        await updateProgress(100, 'Dubbed audio generated');
        return { audioPath: result.filePath, duration: result.duration };
    });
    /**
     * 4. VIDEO EXPORT WORKER
     */
    jobQueue_js_1.jobQueue.registerWorker('export', async (job, updateProgress, isCancelled) => {
        await updateProgress(5, 'Preparing assets for video rendering...');
        const project = await Project_js_1.Project.findById(job.projectId);
        if (!project)
            throw new Error('Project not found');
        const video = await Video_js_1.Video.findOne({ projectId: project._id });
        if (!video)
            throw new Error('Source video not found');
        const exportDoc = await ExportJob_js_1.ExportJob.findById(job.metadata?.exportId);
        if (!exportDoc)
            throw new Error('Export record not found');
        exportDoc.status = 'processing';
        await exportDoc.save();
        const { format = 'mp4', resolution = '1080p', burnSubtitles = true, replaceAudio = true, originalAudioVolume = 0.1, dubbedAudioVolume = 1.0, mixBgMusic = false, bgMusicVolume = 0.15, } = job.metadata || {};
        // Determine subtitle file path if burning
        let srtPath = undefined;
        if (burnSubtitles) {
            const translatedSub = await Subtitle_js_1.Subtitle.findOne({ projectId: project._id, type: 'translated' });
            if (translatedSub && translatedSub.segments.length > 0) {
                const srtContent = (0, srtParser_js_1.buildSrt)(translatedSub.segments);
                const srtDir = storageService_js_1.storageService.getDirectory('subtitles');
                const srtFilename = `export_${Date.now()}_${project._id}.srt`;
                srtPath = path_1.default.join(srtDir, srtFilename);
                fs_1.default.writeFileSync(srtPath, srtContent, 'utf8');
            }
        }
        // Determine dubbed audio path if replacing/mixing
        let dubbedAudioPath = undefined;
        if (replaceAudio) {
            const audioDoc = await Audio_js_1.Audio.findOne({ projectId: project._id, type: 'tts' }).sort({ createdAt: -1 });
            if (audioDoc && fs_1.default.existsSync(audioDoc.path)) {
                dubbedAudioPath = audioDoc.path;
            }
        }
        const outFilename = `export_${Date.now()}_${project._id}.${format}`;
        const exportDir = storageService_js_1.storageService.getDirectory('exports');
        const outPath = path_1.default.join(exportDir, outFilename);
        await updateProgress(20, 'Rendering video with FFmpeg...');
        await ffmpegService_js_1.ffmpegService.renderVideo({
            videoPath: video.path,
            dubbedAudioPath,
            originalAudioVolume: replaceAudio ? originalAudioVolume : 1.0,
            dubbedAudioVolume,
            burnSubtitles,
            subtitlePath: srtPath,
            resolution,
            format,
            outputPath: outPath,
            onProgress: (p) => {
                const progress = Math.min(98, Math.max(20, Math.round(20 + p * 0.75)));
                updateProgress(progress, `Rendering video with FFmpeg (${p}%)...`);
            },
        });
        if (isCancelled())
            return;
        // Get final file size
        const stat = fs_1.default.statSync(outPath);
        exportDoc.outputPath = outPath;
        exportDoc.filename = outFilename;
        exportDoc.fileSizeBytes = stat.size;
        exportDoc.status = 'completed';
        exportDoc.progress = 100;
        await exportDoc.save();
        project.exportedVideoFile = `/uploads/exports/${outFilename}`;
        project.status = 'completed';
        project.currentStep = 6;
        await project.save();
        await UsageRecord_js_1.UsageRecord.create({
            userId: job.userId,
            projectId: project._id,
            feature: 'export',
            provider: 'FFmpeg Media Encoder',
            durationSeconds: video.duration,
            costEstimate: 0,
            status: 'success',
        });
        await updateProgress(100, 'Video export ready for download');
        return { outputPath: outPath, filename: outFilename, size: stat.size };
    });
}
