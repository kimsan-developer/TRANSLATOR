import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { Subtitle, ISubtitleSegment } from '../models/Subtitle.js';
import { Project } from '../models/Project.js';
import { parseSrt, buildSrt, buildVtt } from '../utils/srtParser.js';

export class SubtitleController {
  public static async getSubtitles(req: AuthRequest, res: Response) {
    try {
      const { projectId, type = 'original' } = req.query;
      const subtitle = await Subtitle.findOne({ projectId, type });
      if (!subtitle) {
        return res.status(404).json({ success: false, error: 'Subtitles not found' });
      }
      return res.json({ success: true, subtitle });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async updateSubtitles(req: AuthRequest, res: Response) {
    try {
      const { projectId, type = 'original', segments } = req.body;
      if (!projectId || !segments) {
        return res.status(400).json({ success: false, error: 'projectId and segments are required' });
      }

      let sub = await Subtitle.findOne({ projectId, type });
      if (!sub) {
        sub = await Subtitle.create({
          projectId,
          userId: req.user?.userId,
          type,
          language: type === 'original' ? 'auto' : 'en',
          segments,
        });
      } else {
        sub.segments = segments;
        await sub.save();
      }

      return res.json({ success: true, subtitle: sub });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async importFile(req: AuthRequest, res: Response) {
    try {
      const file = req.file;
      const { projectId, type = 'original', language = 'en' } = req.body;

      if (!file) return res.status(400).json({ success: false, error: 'File is required' });
      const fs = await import('fs');
      const content = fs.readFileSync(file.path, 'utf8');

      const segments = parseSrt(content);

      let sub = await Subtitle.findOne({ projectId, type });
      if (!sub) {
        sub = await Subtitle.create({
          projectId,
          userId: req.user?.userId,
          type,
          language,
          segments,
        });
      } else {
        sub.segments = segments;
        sub.language = language;
        await sub.save();
      }

      return res.json({ success: true, count: segments.length, subtitle: sub });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async splitSegment(req: AuthRequest, res: Response) {
    try {
      const { projectId, type = 'original', segmentId, splitTime } = req.body;
      const sub = await Subtitle.findOne({ projectId, type });
      if (!sub) return res.status(404).json({ success: false, error: 'Subtitles not found' });

      const idx = sub.segments.findIndex((s) => s.id === segmentId);
      if (idx === -1) return res.status(404).json({ success: false, error: 'Segment not found' });

      const current = sub.segments[idx];
      if (splitTime <= current.start || splitTime >= current.end) {
        return res.status(400).json({ success: false, error: 'Split time must be within segment duration' });
      }

      const words = current.text.split(' ');
      const mid = Math.ceil(words.length / 2);
      const firstText = words.slice(0, mid).join(' ');
      const secondText = words.slice(mid).join(' ');

      const seg1: ISubtitleSegment = {
        id: current.id,
        start: current.start,
        end: splitTime,
        text: firstText,
      };

      const seg2: ISubtitleSegment = {
        id: Math.max(...sub.segments.map((s) => s.id)) + 1,
        start: splitTime,
        end: current.end,
        text: secondText,
      };

      sub.segments.splice(idx, 1, seg1, seg2);
      // Re-index sequentially
      sub.segments = sub.segments
        .sort((a, b) => a.start - b.start)
        .map((s, i) => ({ ...s, id: i + 1 }));

      await sub.save();
      return res.json({ success: true, subtitle: sub });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async mergeSegments(req: AuthRequest, res: Response) {
    try {
      const { projectId, type = 'original', firstSegmentId, secondSegmentId } = req.body;
      const sub = await Subtitle.findOne({ projectId, type });
      if (!sub) return res.status(404).json({ success: false, error: 'Subtitles not found' });

      const first = sub.segments.find((s) => s.id === firstSegmentId);
      const second = sub.segments.find((s) => s.id === secondSegmentId);

      if (!first || !second) {
        return res.status(404).json({ success: false, error: 'One or both segments not found' });
      }

      const merged: ISubtitleSegment = {
        id: first.id,
        start: Math.min(first.start, second.start),
        end: Math.max(first.end, second.end),
        text: `${first.text} ${second.text}`.trim(),
      };

      sub.segments = sub.segments
        .filter((s) => s.id !== firstSegmentId && s.id !== secondSegmentId)
        .concat(merged)
        .sort((a, b) => a.start - b.start)
        .map((s, i) => ({ ...s, id: i + 1 }));

      await sub.save();
      return res.json({ success: true, subtitle: sub });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}
