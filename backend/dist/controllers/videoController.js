"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideoController = void 0;
const path_1 = __importDefault(require("path"));
const Project_js_1 = require("../models/Project.js");
const Video_js_1 = require("../models/Video.js");
const ffmpegService_js_1 = require("../services/ffmpegService.js");
class VideoController {
    static async upload(req, res) {
        try {
            const file = req.file;
            const { projectId } = req.body;
            if (!file) {
                return res.status(400).json({ success: false, error: 'No video file provided' });
            }
            if (!projectId) {
                return res.status(400).json({ success: false, error: 'projectId is required' });
            }
            const project = await Project_js_1.Project.findById(projectId);
            if (!project) {
                return res.status(404).json({ success: false, error: 'Project not found' });
            }
            const videoFilePath = file.path;
            // Extract real video metadata using FFmpeg/FFprobe
            const metadata = await ffmpegService_js_1.ffmpegService.extractMetadata(videoFilePath);
            // Generate real thumbnail at 1s
            const thumbFilename = `thumb_${Date.now()}_${path_1.default.parse(file.filename).name}.jpg`;
            let thumbnailPath = '';
            try {
                thumbnailPath = await ffmpegService_js_1.ffmpegService.generateThumbnail(videoFilePath, thumbFilename);
            }
            catch (thumbErr) {
                console.warn('Thumbnail generation skipped or failed:', thumbErr);
            }
            // Save Video document in DB
            const video = await Video_js_1.Video.create({
                projectId: project._id,
                userId: req.user?.userId,
                originalName: file.originalname,
                filename: file.filename,
                path: videoFilePath,
                size: file.size,
                duration: metadata.duration,
                resolution: {
                    width: metadata.width,
                    height: metadata.height,
                },
                format: metadata.format,
                fps: metadata.fps,
                bitrate: metadata.bitrate,
                thumbnailPath: thumbFilename ? `/uploads/thumbnails/${thumbFilename}` : undefined,
            });
            // Update project
            project.videoFile = `/uploads/videos/${file.filename}`;
            project.videoDuration = metadata.duration;
            project.thumbnail = video.thumbnailPath;
            project.status = 'uploaded';
            project.currentStep = 2; // ready for transcription
            await project.save();
            return res.status(201).json({
                success: true,
                video,
                metadata,
            });
        }
        catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }
    static async getMetadata(req, res) {
        try {
            const video = await Video_js_1.Video.findById(req.params.id);
            if (!video)
                return res.status(404).json({ success: false, error: 'Video not found' });
            return res.json({ success: true, video });
        }
        catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }
}
exports.VideoController = VideoController;
