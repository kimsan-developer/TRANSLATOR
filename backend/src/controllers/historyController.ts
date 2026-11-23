import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { UsageRecord } from '../models/UsageRecord.js';

export class HistoryController {
  public static async listUsage(req: AuthRequest, res: Response) {
    try {
      const filter: any = req.user?.role === 'superadmin' ? {} : { userId: req.user?.userId };
      const records = await UsageRecord.find(filter)
        .populate('projectId', 'title')
        .sort({ timestamp: -1 })
        .limit(100);

      // Aggregate totals
      const totals = await UsageRecord.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$feature',
            totalCost: { $sum: '$costEstimate' },
            totalDuration: { $sum: '$durationSeconds' },
            totalChars: { $sum: '$characterCount' },
            count: { $sum: 1 },
          },
        },
      ]);

      return res.json({ success: true, records, totals });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}
