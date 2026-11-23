import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { Project } from '../models/Project.js';
import { Video } from '../models/Video.js';
import { Subtitle } from '../models/Subtitle.js';
import { jobQueue } from '../queues/jobQueue.js';
import { buildSrt, buildVtt } from '../utils/srtParser.js';

export class TranscriptionController {
  public static async startTranscription(req: AuthRequest, res: Response) {
    try {
      const { projectId, language = 'auto', model = 'base', provider = 'whisper' } = req.body;
      if (!projectId) return res.status(400).json({ success: false, error: 'projectId is required' });

      const project = await Project.findById(projectId);
      if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

      const video = await Video.findOne({ projectId: project._id });
      if (!video) return res.status(400).json({ success: false, error: 'Project has no uploaded video to transcribe' });

      // Add to background job queue
      const job = await jobQueue.addJob({
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
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async exportFormat(req: AuthRequest, res: Response) {
    try {
      const { projectId, format = 'srt', type = 'original' } = req.query;
      const sub = await Subtitle.findOne({ projectId, type });
      if (!sub) return res.status(404).json({ success: false, error: 'Subtitles not found for this project' });

      if (format === 'vtt') {
        const vtt = buildVtt(sub.segments);
        res.setHeader('Content-Type', 'text/vtt');
        res.setHeader('Content-Disposition', `attachment; filename="subtitles_${type}.vtt"`);
        return res.send(vtt);
      } else if (format === 'txt') {
        const txt = sub.segments.map((s) => s.text).join('\n');
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="transcript_${type}.txt"`);
        return res.send(txt);
      } else {
        const srt = buildSrt(sub.segments);
        res.setHeader('Content-Type', 'application/x-subrip; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="subtitles_${type}.srt"`);
        return res.send(srt);
      }
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}
