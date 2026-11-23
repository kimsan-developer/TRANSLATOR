import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { Project } from '../models/Project.js';
import { Subtitle } from '../models/Subtitle.js';
import { jobQueue } from '../queues/jobQueue.js';

export class TranslationController {
  public static async startTranslation(req: AuthRequest, res: Response) {
    try {
      const { projectId, targetLanguage, sourceLanguage, provider = 'gemini', style = 'formal' } = req.body;
      if (!projectId) return res.status(400).json({ success: false, error: 'projectId is required' });

      const project = await Project.findById(projectId);
      if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

      const originalSub = await Subtitle.findOne({ projectId: project._id, type: 'original' });
      if (!originalSub || originalSub.segments.length === 0) {
        return res.status(400).json({ success: false, error: 'No original subtitles found to translate' });
      }

      const targetLang = targetLanguage || project.targetLanguage || 'en';
      const sourceLang = sourceLanguage || project.sourceLanguage || originalSub.language || 'auto';

      project.targetLanguage = targetLang;
      await project.save();

      const job = await jobQueue.addJob({
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
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}
