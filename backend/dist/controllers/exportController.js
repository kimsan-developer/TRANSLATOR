"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExportController = void 0;
const Project_js_1 = require("../models/Project.js");
const ExportJob_js_1 = require("../models/ExportJob.js");
const jobQueue_js_1 = require("../queues/jobQueue.js");
const storageService_js_1 = require("../services/storageService.js");
class ExportController {
    static async startExport(req, res) {
        try {
            const { projectId, format = 'mp4', resolution = '1080p', burnSubtitles = true, replaceAudio = true, mixBgMusic = false, originalAudioVolume = 0.1, dubbedAudioVolume = 1.0, bgMusicVolume = 0.15, } = req.body;
            if (!projectId)
                return res.status(400).json({ success: false, error: 'projectId is required' });
            const project = await Project_js_1.Project.findById(projectId);
            if (!project)
                return res.status(404).json({ success: false, error: 'Project not found' });
            const exportDoc = await ExportJob_js_1.ExportJob.create({
                projectId: project._id,
                userId: req.user?.userId,
                format,
                resolution,
                burnSubtitles,
                replaceAudio,
                mixBgMusic,
                originalAudioVolume,
                dubbedAudioVolume,
                bgMusicVolume,
                status: 'pending',
                progress: 0,
            });
            const job = await jobQueue_js_1.jobQueue.addJob({
                projectId: project._id,
                userId: req.user?.userId,
                type: 'export',
                metadata: {
                    exportId: exportDoc._id,
                    format,
                    resolution,
                    burnSubtitles,
                    replaceAudio,
                    mixBgMusic,
                    originalAudioVolume,
                    dubbedAudioVolume,
                    bgMusicVolume,
                },
            });
            return res.status(202).json({
                success: true,
                message: 'Video export queued in background worker',
                exportId: exportDoc._id,
                jobId: job._id,
            });
        }
        catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }
    static async getExportStatus(req, res) {
        try {
            const exportJob = await ExportJob_js_1.ExportJob.findById(req.params.id);
            if (!exportJob)
                return res.status(404).json({ success: false, error: 'Export job not found' });
            return res.json({ success: true, exportJob });
        }
        catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }
    static async cancelExport(req, res) {
        try {
            const { jobId, exportId } = req.body;
            if (jobId) {
                await jobQueue_js_1.jobQueue.cancelJob(jobId);
            }
            if (exportId) {
                await ExportJob_js_1.ExportJob.findByIdAndUpdate(exportId, { status: 'cancelled' });
            }
            return res.json({ success: true, message: 'Export cancelled' });
        }
        catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }
    static async downloadFile(req, res) {
        try {
            const exportJob = await ExportJob_js_1.ExportJob.findById(req.params.id);
            if (!exportJob || !exportJob.outputPath) {
                return res.status(404).json({ success: false, error: 'Finished export file not found' });
            }
            if (!storageService_js_1.storageService.fileExists(exportJob.outputPath)) {
                return res.status(404).json({ success: false, error: 'File on disk missing' });
            }
            const filename = exportJob.filename || `translated_video.${exportJob.format}`;
            return res.download(exportJob.outputPath, filename);
        }
        catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }
}
exports.ExportController = ExportController;
