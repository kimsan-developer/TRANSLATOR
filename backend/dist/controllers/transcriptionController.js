"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranscriptionController = void 0;
const Project_js_1 = require("../models/Project.js");
const Video_js_1 = require("../models/Video.js");
const Subtitle_js_1 = require("../models/Subtitle.js");
const jobQueue_js_1 = require("../queues/jobQueue.js");
const srtParser_js_1 = require("../utils/srtParser.js");
class TranscriptionController {
    static async startTranscription(req, res) {
        try {
            const { projectId, language = 'auto', model = 'base', provider = 'whisper' } = req.body;
            if (!projectId)
                return res.status(400).json({ success: false, error: 'projectId is required' });
            const project = await Project_js_1.Project.findById(projectId);
            if (!project)
                return res.status(404).json({ success: false, error: 'Project not found' });
            const video = await Video_js_1.Video.findOne({ projectId: project._id });
            if (!video)
                return res.status(400).json({ success: false, error: 'Project has no uploaded video to transcribe' });
            // Add to background job queue
            const job = await jobQueue_js_1.jobQueue.addJob({
                projectId: project._id,
                userId: req.user?.userId,
                type: 'transcription',
                metadata: {
                    videoPath: video.path,
                    language,
                    model,
                    provider,
                },
            });
            project.status = 'transcribing';
            await project.save();
            return res.status(202).json({
                success: true,
                message: 'Transcription job queued in background worker',
                jobId: job._id,
            });
        }
        catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }
    static async exportFormat(req, res) {
        try {
            const { projectId, format = 'srt', type = 'original' } = req.query;
            const sub = await Subtitle_js_1.Subtitle.findOne({ projectId, type });
            if (!sub)
                return res.status(404).json({ success: false, error: 'Subtitles not found for this project' });
            if (format === 'vtt') {
                const vtt = (0, srtParser_js_1.buildVtt)(sub.segments);
                res.setHeader('Content-Type', 'text/vtt');
                res.setHeader('Content-Disposition', `attachment; filename="subtitles_${type}.vtt"`);
                return res.send(vtt);
            }
            else if (format === 'txt') {
                const txt = sub.segments.map((s) => s.text).join('\n');
                res.setHeader('Content-Type', 'text/plain; charset=utf-8');
                res.setHeader('Content-Disposition', `attachment; filename="transcript_${type}.txt"`);
                return res.send(txt);
            }
            else {
                const srt = (0, srtParser_js_1.buildSrt)(sub.segments);
                res.setHeader('Content-Type', 'application/x-subrip; charset=utf-8');
                res.setHeader('Content-Disposition', `attachment; filename="subtitles_${type}.srt"`);
                return res.send(srt);
            }
        }
        catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }
}
exports.TranscriptionController = TranscriptionController;
