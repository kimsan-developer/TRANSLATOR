import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { User } from '../models/User.js';
import { Project } from '../models/Project.js';
import { ProcessingJob } from '../models/ProcessingJob.js';
import { SystemSetting } from '../models/SystemSetting.js';
import { storageService } from '../services/storageService.js';

export class AdminController {
  public static async listUsers(req: AuthRequest, res: Response) {
    try {
      const users = await User.find({}).select('-password').sort({ createdAt: -1 });
      return res.json({ success: true, users });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async updateUserRole(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { role, isActive } = req.body;

      const user = await User.findById(id);
      if (!user) return res.status(404).json({ success: false, error: 'User not found' });

      if (role) user.role = role;
      if (isActive !== undefined) user.isActive = isActive;
      await user.save();

      return res.json({ success: true, user });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async getAllJobs(req: AuthRequest, res: Response) {
    try {
      const jobs = await ProcessingJob.find({})
        .populate('projectId', 'title')
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .limit(50);
      return res.json({ success: true, jobs });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async getSystemMetrics(req: AuthRequest, res: Response) {
    try {
      const totalUsers = await User.countDocuments();
      const totalProjects = await Project.countDocuments();
      const storageStats = storageService.getStorageStats();
      const activeJobsCount = await ProcessingJob.countDocuments({ status: { $in: ['pending', 'processing'] } });
      const failedJobsCount = await ProcessingJob.countDocuments({ status: 'failed' });

      return res.json({
        success: true,
        metrics: {
          totalUsers,
          totalProjects,
          activeJobsCount,
          failedJobsCount,
          storageStats,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async getSettings(req: AuthRequest, res: Response) {
    try {
      const settings = await SystemSetting.find({});
      return res.json({ success: true, settings });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async updateSetting(req: AuthRequest, res: Response) {
    try {
      const { key, value, description, category } = req.body;
      const setting = await SystemSetting.findOneAndUpdate(
        { key },
        { value, description, category },
        { upsert: true, new: true }
      );
      return res.json({ success: true, setting });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}
