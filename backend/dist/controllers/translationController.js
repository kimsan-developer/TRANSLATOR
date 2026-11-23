"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranslationController = void 0;
const Project_js_1 = require("../models/Project.js");
const Subtitle_js_1 = require("../models/Subtitle.js");
const jobQueue_js_1 = require("../queues/jobQueue.js");
class TranslationController {
    static async startTranslation(req, res) {
        try {
            const { projectId, targetLanguage, sourceLanguage, provider = 'gemini', style = 'formal' } = req.body;
            if (!projectId)
                return res.status(400).json({ success: false, error: 'projectId is required' });
            const project = await Project_js_1.Project.findById(projectId);
            if (!project)
                return res.status(404).json({ success: false, error: 'Project not found' });
            const originalSub = await Subtitle_js_1.Subtitle.findOne({ projectId: project._id, type: 'original' });
            if (!originalSub || originalSub.segments.length === 0) {
                return res.status(400).json({ success: false, error: 'No original subtitles found to translate' });
            }
            const targetLang = targetLanguage || project.targetLanguage || 'en';
            const sourceLang = sourceLanguage || project.sourceLanguage || originalSub.language || 'auto';
            project.targetLanguage = targetLang;
            await project.save();
            const job = await jobQueue_js_1.jobQueue.addJob({
                projectId: project._id,
                userId: req.user?.userId,
                type: 'translation',
                metadata: {
                    sourceLanguage: sourceLang,
                    targetLanguage: targetLang,
                    provider,
                    style,
                },
            });
            return res.status(202).json({
                success: true,
                message: 'Translation job queued in background worker',
                jobId: job._id,
            });
        }
        catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }
}
exports.TranslationController = TranslationController;
