"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubtitleController = void 0;
const Subtitle_js_1 = require("../models/Subtitle.js");
const srtParser_js_1 = require("../utils/srtParser.js");
class SubtitleController {
    static async getSubtitles(req, res) {
        try {
            const { projectId, type = 'original' } = req.query;
            const subtitle = await Subtitle_js_1.Subtitle.findOne({ projectId, type });
            if (!subtitle) {
                return res.status(404).json({ success: false, error: 'Subtitles not found' });
            }
            return res.json({ success: true, subtitle });
        }
        catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }
    static async updateSubtitles(req, res) {
        try {
            const { projectId, type = 'original', segments } = req.body;
            if (!projectId || !segments) {
                return res.status(400).json({ success: false, error: 'projectId and segments are required' });
            }
            let sub = await Subtitle_js_1.Subtitle.findOne({ projectId, type });
            if (!sub) {
                sub = await Subtitle_js_1.Subtitle.create({
                    projectId,
                    userId: req.user?.userId,
                    type,
                    language: type === 'original' ? 'auto' : 'en',
                    segments,
                });
            }
            else {
                sub.segments = segments;
                await sub.save();
            }
            return res.json({ success: true, subtitle: sub });
        }
        catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }
    static async importFile(req, res) {
        try {
            const file = req.file;
            const { projectId, type = 'original', language = 'en' } = req.body;
            if (!file)
                return res.status(400).json({ success: false, error: 'File is required' });
            const fs = await import('fs');
            const content = fs.readFileSync(file.path, 'utf8');
            const segments = (0, srtParser_js_1.parseSrt)(content);
            let sub = await Subtitle_js_1.Subtitle.findOne({ projectId, type });
            if (!sub) {
                sub = await Subtitle_js_1.Subtitle.create({
                    projectId,
                    userId: req.user?.userId,
                    type,
                    language,
                    segments,
                });
            }
            else {
                sub.segments = segments;
                sub.language = language;
                await sub.save();
            }
            return res.json({ success: true, count: segments.length, subtitle: sub });
        }
        catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }
    static async splitSegment(req, res) {
        try {
            const { projectId, type = 'original', segmentId, splitTime } = req.body;
            const sub = await Subtitle_js_1.Subtitle.findOne({ projectId, type });
            if (!sub)
                return res.status(404).json({ success: false, error: 'Subtitles not found' });
            const idx = sub.segments.findIndex((s) => s.id === segmentId);
            if (idx === -1)
                return res.status(404).json({ success: false, error: 'Segment not found' });
            const current = sub.segments[idx];
            if (splitTime <= current.start || splitTime >= current.end) {
                return res.status(400).json({ success: false, error: 'Split time must be within segment duration' });
            }
            const words = current.text.split(' ');
            const mid = Math.ceil(words.length / 2);
            const firstText = words.slice(0, mid).join(' ');
            const secondText = words.slice(mid).join(' ');
            const seg1 = {
                id: current.id,
                start: current.start,
                end: splitTime,
                text: firstText,
            };
            const seg2 = {
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
        }
        catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }
    static async mergeSegments(req, res) {
        try {
            const { projectId, type = 'original', firstSegmentId, secondSegmentId } = req.body;
            const sub = await Subtitle_js_1.Subtitle.findOne({ projectId, type });
            if (!sub)
                return res.status(404).json({ success: false, error: 'Subtitles not found' });
            const first = sub.segments.find((s) => s.id === firstSegmentId);
            const second = sub.segments.find((s) => s.id === secondSegmentId);
            if (!first || !second) {
                return res.status(404).json({ success: false, error: 'One or both segments not found' });
            }
            const merged = {
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
        }
        catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }
}
exports.SubtitleController = SubtitleController;
