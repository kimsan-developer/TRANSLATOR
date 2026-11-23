import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { Project } from '../models/Project.js';
import { Video } from '../models/Video.js';
import { Subtitle } from '../models/Subtitle.js';
import { Audio } from '../models/Audio.js';
import { ProcessingJob } from '../models/ProcessingJob.js';
import { AIProvider } from '../models/AIProvider.js';
import { storageService } from '../services/storageService.js';

export class ProjectController {
  public static async list(req: AuthRequest, res: Response) {
    try {
      const query: any = req.user?.role === 'superadmin' ? {} : { userId: req.user?.userId };
      const projects = await Project.find(query).sort({ updatedAt: -1 }).populate('originalSubtitleId translatedSubtitleId');
      return res.json({ success: true, projects });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async create(req: AuthRequest, res: Response) {
    try {
      const { title, description, sourceLanguage = 'auto', targetLanguage = 'en' } = req.body;
      if (!title) {
        return res.status(400).json({ success: false, error: 'Project title is required' });
      }

      const project = await Project.create({
        title,
        description,
        sourceLanguage,
        targetLanguage,
        userId: req.user?.userId,
        status: 'draft',
        currentStep: 1,
      });

      return res.status(201).json({ success: true, project });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async getById(req: AuthRequest, res: Response) {
    try {
      const project = await Project.findById(req.params.id);
      if (!project) {
        return res.status(404).json({ success: false, error: 'Project not found' });
      }

      if (req.user?.role !== 'superadmin' && project.userId.toString() !== req.user?.userId) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }

      const video = await Video.findOne({ projectId: project._id });
      const originalSub = await Subtitle.findOne({ projectId: project._id, type: 'original' });
      const translatedSub = await Subtitle.findOne({ projectId: project._id, type: 'translated' });
      const audioTracks = await Audio.find({ projectId: project._id });
      const recentJobs = await ProcessingJob.find({ projectId: project._id }).sort({ createdAt: -1 }).limit(10);

      return res.json({
        success: true,
        project,
        video,
        originalSubtitle: originalSub,
        translatedSubtitle: translatedSub,
        audioTracks,
        recentJobs,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async update(req: AuthRequest, res: Response) {
    try {
      const project = await Project.findById(req.params.id);
      if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

      if (req.user?.role !== 'superadmin' && project.userId.toString() !== req.user?.userId) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }

      const { title, description, sourceLanguage, targetLanguage, status, currentStep } = req.body;
      if (title) project.title = title;
      if (description !== undefined) project.description = description;
      if (sourceLanguage) project.sourceLanguage = sourceLanguage;
      if (targetLanguage) project.targetLanguage = targetLanguage;
      if (status) project.status = status;
      if (currentStep) project.currentStep = currentStep;

      await project.save();
      return res.json({ success: true, project });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async delete(req: AuthRequest, res: Response) {
    try {
      const project = await Project.findById(req.params.id);
      if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

      if (req.user?.role !== 'superadmin' && project.userId.toString() !== req.user?.userId) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }

      // Cleanup associated records and files
      await Video.deleteMany({ projectId: project._id });
      await Subtitle.deleteMany({ projectId: project._id });
      await Audio.deleteMany({ projectId: project._id });
      await ProcessingJob.deleteMany({ projectId: project._id });
      await project.deleteOne();

      return res.json({ success: true, message: 'Project and all associated assets deleted' });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async getDashboardStats(req: AuthRequest, res: Response) {
    try {
      const userFilter = req.user?.role === 'superadmin' ? {} : { userId: req.user?.userId };

      const totalProjects = await Project.countDocuments(userFilter);
      const totalVideosProcessed = await Video.countDocuments(userFilter);
      const totalGeneratedAudio = await Audio.countDocuments(userFilter);
      const recentProjects = await Project.find(userFilter).sort({ updatedAt: -1 }).limit(5);
      const activeJobs = await ProcessingJob.find({ ...userFilter, status: { $in: ['pending', 'processing'] } });
      const recentCompletedJobs = await ProcessingJob.find(userFilter).sort({ createdAt: -1 }).limit(6);
      const providers = await AIProvider.find({});
      const storageStats = storageService.getStorageStats();

      return res.json({
        success: true,
        stats: {
          totalProjects,
          totalVideosProcessed,
          totalTranslations: await Subtitle.countDocuments({ ...userFilter, type: 'translated' }),
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
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}
