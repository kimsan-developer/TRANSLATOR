"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HistoryController = void 0;
const UsageRecord_js_1 = require("../models/UsageRecord.js");
class HistoryController {
    static async listUsage(req, res) {
        try {
            const filter = req.user?.role === 'superadmin' ? {} : { userId: req.user?.userId };
            const records = await UsageRecord_js_1.UsageRecord.find(filter)
                .populate('projectId', 'title')
                .sort({ timestamp: -1 })
                .limit(100);
            // Aggregate totals
            const totals = await UsageRecord_js_1.UsageRecord.aggregate([
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
        }
        catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }
}
exports.HistoryController = HistoryController;
