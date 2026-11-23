import { Response } from 'express';
import path from 'path';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { Project } from '../models/Project.js';
import { ExportJob } from '../models/ExportJob.js';
import { jobQueue } from '../queues/jobQueue.js';
import { storageService } from '../services/storageService.js';

export class ExportController {
  public static async startExport(req: AuthRequest, res: Response) {
    try {
      const {
        projectId,
        format = 'mp4',
        resolution = '1080p',
        burnSubtitles = true,
        replaceAudio = true,
        mixBgMusic = false,
        originalAudioVolume = 0.1,
        dubbedAudioVolume = 1.0,
        bgMusicVolume = 0.15,
      } = req.body;

      if (!projectId) return res.status(400).json({ success: false, error: 'projectId is required' });

      const project = await Project.findById(projectId);
      if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

      const exportDoc = await ExportJob.create({
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

      const job = await jobQueue.addJob({
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
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async getExportStatus(req: AuthRequest, res: Response) {
    try {
      const exportJob = await ExportJob.findById(req.params.id);
      if (!exportJob) return res.status(404).json({ success: false, error: 'Export job not found' });
      return res.json({ success: true, exportJob });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async cancelExport(req: AuthRequest, res: Response) {
    try {
      const { jobId, exportId } = req.body;
      if (jobId) {
        await jobQueue.cancelJob(jobId);
      }
      if (exportId) {
        await ExportJob.findByIdAndUpdate(exportId, { status: 'cancelled' });
      }
      return res.json({ success: true, message: 'Export cancelled' });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async downloadFile(req: AuthRequest, res: Response) {
    try {
      const exportJob = await ExportJob.findById(req.params.id);
      if (!exportJob || !exportJob.outputPath) {
        return res.status(404).json({ success: false, error: 'Finished export file not found' });
      }

      if (!storageService.fileExists(exportJob.outputPath)) {
        return res.status(404).json({ success: false, error: 'File on disk missing' });
      }

      const filename = exportJob.filename || `translated_video.${exportJob.format}`;
      return res.download(exportJob.outputPath, filename);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}
