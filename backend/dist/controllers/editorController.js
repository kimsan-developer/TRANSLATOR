"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EditorController = void 0;
const Project_js_1 = require("../models/Project.js");
const Video_js_1 = require("../models/Video.js");
const Subtitle_js_1 = require("../models/Subtitle.js");
const Audio_js_1 = require("../models/Audio.js");
class EditorController {
    static async getTimelineData(req, res) {
        try {
            const { projectId } = req.params;
            const project = await Project_js_1.Project.findById(projectId);
            if (!project)
                return res.status(404).json({ success: false, error: 'Project not found' });
            const video = await Video_js_1.Video.findOne({ projectId: project._id });
            const originalSub = await Subtitle_js_1.Subtitle.findOne({ projectId: project._id, type: 'original' });
            const translatedSub = await Subtitle_js_1.Subtitle.findOne({ projectId: project._id, type: 'translated' });
            const audioTracks = await Audio_js_1.Audio.find({ projectId: project._id });
            return res.json({
                success: true,
                project,
                video,
                originalSub,
                translatedSub,
                audioTracks,
            });
        }
        catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }
    static async updateTrackSettings(req, res) {
        try {
            const { audioId, volume } = req.body;
            const audio = await Audio_js_1.Audio.findById(audioId);
            if (!audio)
                return res.status(404).json({ success: false, error: 'Audio track not found' });
            if (volume !== undefined)
                audio.volume = volume;
            await audio.save();
            return res.json({ success: true, audio });
        }
        catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }
}
exports.EditorController = EditorController;
