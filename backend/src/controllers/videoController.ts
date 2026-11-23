import { Response } from 'express';
import path from 'path';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { Project } from '../models/Project.js';
import { Video } from '../models/Video.js';
import { ffmpegService } from '../services/ffmpegService.js';
import { storageService } from '../services/storageService.js';

export class VideoController {
  public static async upload(req: AuthRequest, res: Response) {
    try {
      const file = req.file;
      const { projectId } = req.body;

      if (!file) {
        return res.status(400).json({ success: false, error: 'No video file provided' });
      }
      if (!projectId) {
        return res.status(400).json({ success: false, error: 'projectId is required' });
      }

      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ success: false, error: 'Project not found' });
      }

      const videoFilePath = file.path;

      // Extract real video metadata using FFmpeg/FFprobe
      const metadata = await ffmpegService.extractMetadata(videoFilePath);

      // Generate real thumbnail at 1s
      const thumbFilename = `thumb_${Date.now()}_${path.parse(file.filename).name}.jpg`;
      let thumbnailPath = '';
      try {
        thumbnailPath = await ffmpegService.generateThumbnail(videoFilePath, thumbFilename);
      } catch (thumbErr) {
        console.warn('Thumbnail generation skipped or failed:', thumbErr);
      }

      // Save Video document in DB
      const video = await Video.create({
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
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async getMetadata(req: AuthRequest, res: Response) {
    try {
      const video = await Video.findById(req.params.id);
      if (!video) return res.status(404).json({ success: false, error: 'Video not found' });
      return res.json({ success: true, video });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}
