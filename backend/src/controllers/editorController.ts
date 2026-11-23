import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { Project } from '../models/Project.js';
import { Video } from '../models/Video.js';
import { Subtitle } from '../models/Subtitle.js';
import { Audio } from '../models/Audio.js';

export class EditorController {
  public static async getTimelineData(req: AuthRequest, res: Response) {
    try {
      const { projectId } = req.params;
      const project = await Project.findById(projectId);
      if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

      const video = await Video.findOne({ projectId: project._id });
      const originalSub = await Subtitle.findOne({ projectId: project._id, type: 'original' });
      const translatedSub = await Subtitle.findOne({ projectId: project._id, type: 'translated' });
      const audioTracks = await Audio.find({ projectId: project._id });

      return res.json({
        success: true,
        project,
        video,
        originalSub,
        translatedSub,
        audioTracks,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async updateTrackSettings(req: AuthRequest, res: Response) {
    try {
      const { audioId, volume } = req.body;
      const audio = await Audio.findById(audioId);
      if (!audio) return res.status(404).json({ success: false, error: 'Audio track not found' });

      if (volume !== undefined) audio.volume = volume;
      await audio.save();

      return res.json({ success: true, audio });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}
