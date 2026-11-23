"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ffmpegService = exports.FFmpegService = void 0;
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const storageService_js_1 = require("./storageService.js");
class FFmpegService {
    /**
     * Probe and extract comprehensive video metadata
     */
    async extractMetadata(filePath) {
        return new Promise((resolve, reject) => {
            fluent_ffmpeg_1.default.ffprobe(filePath, (err, metadata) => {
                if (err)
                    return reject(err);
                const videoStream = metadata.streams.find((s) => s.codec_type === 'video');
                const audioStream = metadata.streams.find((s) => s.codec_type === 'audio');
                let fps = 30;
                if (videoStream?.r_frame_rate) {
                    const [num, den] = videoStream.r_frame_rate.split('/').map(Number);
                    if (den && den > 0)
                        fps = Math.round(num / den);
                }
                const result = {
                    duration: metadata.format.duration || 0,
                    width: videoStream?.width || 1920,
                    height: videoStream?.height || 1080,
                    format: metadata.format.format_name || 'mp4',
                    fps: fps || 30,
                    bitrate: metadata.format.bit_rate ? Number(metadata.format.bit_rate) : 0,
                    audioChannels: audioStream?.channels || 2,
                };
                resolve(result);
            });
        });
    }
    /**
     * Generate video thumbnail at timestamp 00:00:01
     */
    async generateThumbnail(videoPath, outputFilename) {
        const thumbDir = storageService_js_1.storageService.getDirectory('thumbnails');
        const outputPath = path_1.default.join(thumbDir, outputFilename);
        return new Promise((resolve, reject) => {
            (0, fluent_ffmpeg_1.default)(videoPath)
                .screenshots({
                timestamps: ['00:00:01.000'],
                filename: outputFilename,
                folder: thumbDir,
                size: '640x360',
            })
                .on('end', () => resolve(outputPath))
                .on('error', (err) => reject(err));
        });
    }
    /**
     * Extract audio track from video as standard 16kHz mono WAV for high-accuracy Whisper transcription
     */
    async extractAudioForTranscription(videoPath, outputFilename) {
        const audioDir = storageService_js_1.storageService.getDirectory('audio');
        const outputPath = path_1.default.join(audioDir, outputFilename);
        return new Promise((resolve, reject) => {
            (0, fluent_ffmpeg_1.default)(videoPath)
                .noVideo()
                .audioCodec('pcm_s16le')
                .audioFrequency(16000)
                .audioChannels(1)
                .output(outputPath)
                .on('end', () => resolve(outputPath))
                .on('error', (err) => reject(err))
                .run();
        });
    }
    /**
     * Extract original stereo audio from video
     */
    async extractOriginalAudio(videoPath, outputFilename) {
        const audioDir = storageService_js_1.storageService.getDirectory('audio');
        const outputPath = path_1.default.join(audioDir, outputFilename);
        return new Promise((resolve, reject) => {
            (0, fluent_ffmpeg_1.default)(videoPath)
                .noVideo()
                .audioCodec('libmp3lame')
                .audioBitrate(192)
                .output(outputPath)
                .on('end', () => resolve(outputPath))
                .on('error', (err) => reject(err))
                .run();
        });
    }
    /**
     * Render and export final video with optional burned subtitles and audio mixing
     */
    async renderVideo(params) {
        return new Promise((resolve, reject) => {
            const { videoPath, dubbedAudioPath, originalAudioVolume = 0.0, dubbedAudioVolume = 1.0, bgMusicPath, bgMusicVolume = 0.15, burnSubtitles = false, subtitlePath, resolution = 'original', format = 'mp4', outputPath, onProgress, } = params;
            let cmd = (0, fluent_ffmpeg_1.default)();
            cmd.input(videoPath);
            const filterComplex = [];
            let audioInputIndex = 0;
            let hasCustomAudio = false;
            // Setup dubbed audio input
            if (dubbedAudioPath && fs_1.default.existsSync(dubbedAudioPath)) {
                cmd.input(dubbedAudioPath);
                audioInputIndex++;
                hasCustomAudio = true;
            }
            // Setup background music input
            let bgMusicIndex = -1;
            if (bgMusicPath && fs_1.default.existsSync(bgMusicPath)) {
                cmd.input(bgMusicPath);
                audioInputIndex++;
                bgMusicIndex = audioInputIndex;
            }
            // Audio mixing filter graph
            if (hasCustomAudio) {
                if (originalAudioVolume > 0.01) {
                    // Mix original video audio + dubbed audio
                    filterComplex.push(`[0:a]volume=${originalAudioVolume}[aorig]`);
                    filterComplex.push(`[1:a]volume=${dubbedAudioVolume}[adub]`);
                    if (bgMusicIndex !== -1) {
                        filterComplex.push(`[${bgMusicIndex}:a]volume=${bgMusicVolume}[abg]`);
                        filterComplex.push(`[aorig][adub][abg]amix=inputs=3:duration=first:dropout_transition=2[aout]`);
                    }
                    else {
                        filterComplex.push(`[aorig][adub]amix=inputs=2:duration=first:dropout_transition=2[aout]`);
                    }
                    cmd.map('[aout]');
                }
                else {
                    // Dubbed replaces original audio
                    if (bgMusicIndex !== -1) {
                        filterComplex.push(`[1:a]volume=${dubbedAudioVolume}[adub]`);
                        filterComplex.push(`[${bgMusicIndex}:a]volume=${bgMusicVolume}[abg]`);
                        filterComplex.push(`[adub][abg]amix=inputs=2:duration=first:dropout_transition=2[aout]`);
                        cmd.map('[aout]');
                    }
                    else {
                        cmd.outputOptions(['-map 0:v:0', '-map 1:a:0']);
                    }
                }
            }
            else {
                cmd.outputOptions(['-map 0:v:0', '-map 0:a?']);
            }
            // Resolution scaling
            if (resolution === '720p') {
                cmd.size('1280x720');
            }
            else if (resolution === '1080p') {
                cmd.size('1920x1080');
            }
            else if (resolution === '4k') {
                cmd.size('3840x2160');
            }
            // Subtitle burning
            if (burnSubtitles && subtitlePath && fs_1.default.existsSync(subtitlePath)) {
                // Normalize windows path for ffmpeg subtitles filter
                const formattedSubPath = subtitlePath.replace(/\\/g, '/').replace(/:/g, '\\:');
                cmd.videoFilters(`subtitles='${formattedSubPath}':force_style='FontSize=22,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=3,Outline=1,Shadow=1,MarginV=25'`);
            }
            if (filterComplex.length > 0) {
                cmd.complexFilter(filterComplex);
            }
            // Codecs & container format
            if (format === 'webm') {
                cmd.videoCodec('libvpx-vp9').audioCodec('libopus');
            }
            else {
                cmd.videoCodec('libx264').audioCodec('aac').audioBitrate(192);
                cmd.outputOptions(['-pix_fmt yuv420p', '-preset fast', '-crf 22']);
            }
            cmd
                .output(outputPath)
                .on('progress', (p) => {
                if (p.percent && onProgress) {
                    onProgress(Math.min(99, Math.round(p.percent)));
                }
            })
                .on('end', () => {
                if (onProgress)
                    onProgress(100);
                resolve(outputPath);
            })
                .on('error', (err) => reject(err))
                .run();
        });
    }
}
exports.FFmpegService = FFmpegService;
exports.ffmpegService = new FFmpegService();
