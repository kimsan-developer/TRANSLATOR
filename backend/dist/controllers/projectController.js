"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectController = void 0;
const Project_js_1 = require("../models/Project.js");
const Video_js_1 = require("../models/Video.js");
const Subtitle_js_1 = require("../models/Subtitle.js");
const Audio_js_1 = require("../models/Audio.js");
const ProcessingJob_js_1 = require("../models/ProcessingJob.js");
const AIProvider_js_1 = require("../models/AIProvider.js");
const storageService_js_1 = require("../services/storageService.js");
class ProjectController {
    static async list(req, res) {
        try {
            const query = req.user?.role === 'superadmin' ? {} : { userId: req.user?.userId };
            const projects = await Project_js_1.Project.find(query).sort({ updatedAt: -1 }).populate('originalSubtitleId translatedSubtitleId');
            return res.json({ success: true, projects });
        }
        catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }
    static async create(req, res) {
        try {
            const { title, description, sourceLanguage = 'auto', targetLanguage = 'en' } = req.body;
            if (!title) {
                return res.status(400).json({ success: false, error: 'Project title is required' });
            }
            const project = await Project_js_1.Project.create({
                title,
                description,
                sourceLanguage,
                targetLanguage,
                userId: req.user?.userId,
                status: 'draft',
                currentStep: 1,
            });
            return res.status(201).json({ success: true, project });
        }
        catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }
    static async getById(req, res) {
        try {
            const project = await Project_js_1.Project.findById(req.params.id);
            if (!project) {
                return res.status(404).json({ success: false, error: 'Project not found' });
            }
            if (req.user?.role !== 'superadmin' && project.userId.toString() !== req.user?.userId) {
                return res.status(403).json({ success: false, error: 'Access denied' });
            }
            const video = await Video_js_1.Video.findOne({ projectId: project._id });
            const originalSub = await Subtitle_js_1.Subtitle.findOne({ projectId: project._id, type: 'original' });
            const translatedSub = await Subtitle_js_1.Subtitle.findOne({ projectId: project._id, type: 'translated' });
            const audioTracks = await Audio_js_1.Audio.find({ projectId: project._id });
            const recentJobs = await ProcessingJob_js_1.ProcessingJob.find({ projectId: project._id }).sort({ createdAt: -1 }).limit(10);
            return res.json({
                success: true,
                project,
                video,
                originalSubtitle: originalSub,
                translatedSubtitle: translatedSub,
                audioTracks,
                recentJobs,
            });
        }
        catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }
    static async update(req, res) {
        try {
            const project = await Project_js_1.Project.findById(req.params.id);
            if (!project)
                return res.status(404).json({ success: false, error: 'Project not found' });
            if (req.user?.role !== 'superadmin' && project.userId.toString() !== req.user?.userId) {
                return res.status(403).json({ success: false, error: 'Access denied' });
            }
            const { title, description, sourceLanguage, targetLanguage, status, currentStep } = req.body;
            if (title)
                project.title = title;
            if (description !== undefined)
                project.description = description;
            if (sourceLanguage)
                project.sourceLanguage = sourceLanguage;
            if (targetLanguage)
                project.targetLanguage = targetLanguage;
            if (status)
                project.status = status;
            if (currentStep)
                project.currentStep = currentStep;
            await project.save();
            return res.json({ success: true, project });
        }
        catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }
    static async delete(req, res) {
        try {
            const project = await Project_js_1.Project.findById(req.params.id);
            if (!project)
                return res.status(404).json({ success: false, error: 'Project not found' });
            if (req.user?.role !== 'superadmin' && project.userId.toString() !== req.user?.userId) {
                return res.status(403).json({ success: false, error: 'Access denied' });
            }
            // Cleanup associated records and files
            await Video_js_1.Video.deleteMany({ projectId: project._id });
            await Subtitle_js_1.Subtitle.deleteMany({ projectId: project._id });
            await Audio_js_1.Audio.deleteMany({ projectId: project._id });
            await ProcessingJob_js_1.ProcessingJob.deleteMany({ projectId: project._id });
            await project.deleteOne();
            return res.json({ success: true, message: 'Project and all associated assets deleted' });
        }
        catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }
    static async getDashboardStats(req, res) {
        try {
            const userFilter = req.user?.role === 'superadmin' ? {} : { userId: req.user?.userId };
            const totalProjects = await Project_js_1.Project.countDocuments(userFilter);
            const totalVideosProcessed = await Video_js_1.Video.countDocuments(userFilter);
            const totalGeneratedAudio = await Audio_js_1.Audio.countDocuments(userFilter);
            const recentProjects = await Project_js_1.Project.find(userFilter).sort({ updatedAt: -1 }).limit(5);
            const activeJobs = await ProcessingJob_js_1.ProcessingJob.find({ ...userFilter, status: { $in: ['pending', 'processing'] } });
            const recentCompletedJobs = await ProcessingJob_js_1.ProcessingJob.find(userFilter).sort({ createdAt: -1 }).limit(6);
            const providers = await AIProvider_js_1.AIProvider.find({});
            const storageStats = storageService_js_1.storageService.getStorageStats();
            return res.json({
                success: true,
                stats: {
                    totalProjects,
                    totalVideosProcessed,
                    totalTranslations: await Subtitle_js_1.Subtitle.countDocuments({ ...userFilter, type: 'translated' }),
                    totalGeneratedAudio,
                    activeJobsCount: activeJobs.length,
                    storageUsageBytes: storageStats.totalSizeBytes,
                    storageTotalFiles: storageStats.totalFiles,
                },
                recentProjects,
                activeJobs,
                recentCompletedJobs,
                providers,
            });
        }
        catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }
}
exports.ProjectController = ProjectController;
