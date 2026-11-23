"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const User_js_1 = require("../models/User.js");
const Project_js_1 = require("../models/Project.js");
const ProcessingJob_js_1 = require("../models/ProcessingJob.js");
const SystemSetting_js_1 = require("../models/SystemSetting.js");
const storageService_js_1 = require("../services/storageService.js");
class AdminController {
    static async listUsers(req, res) {
        try {
            const users = await User_js_1.User.find({}).select('-password').sort({ createdAt: -1 });
            return res.json({ success: true, users });
        }
        catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }
    static async updateUserRole(req, res) {
        try {
            const { id } = req.params;
            const { role, isActive } = req.body;
            const user = await User_js_1.User.findById(id);
            if (!user)
                return res.status(404).json({ success: false, error: 'User not found' });
            if (role)
                user.role = role;
            if (isActive !== undefined)
                user.isActive = isActive;
            await user.save();
            return res.json({ success: true, user });
        }
        catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }
    static async getAllJobs(req, res) {
        try {
            const jobs = await ProcessingJob_js_1.ProcessingJob.find({})
                .populate('projectId', 'title')
                .populate('userId', 'name email')
                .sort({ createdAt: -1 })
                .limit(50);
            return res.json({ success: true, jobs });
        }
        catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }
    static async getSystemMetrics(req, res) {
        try {
            const totalUsers = await User_js_1.User.countDocuments();
            const totalProjects = await Project_js_1.Project.countDocuments();
            const storageStats = storageService_js_1.storageService.getStorageStats();
            const activeJobsCount = await ProcessingJob_js_1.ProcessingJob.countDocuments({ status: { $in: ['pending', 'processing'] } });
            const failedJobsCount = await ProcessingJob_js_1.ProcessingJob.countDocuments({ status: 'failed' });
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
        }
        catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }
    static async getSettings(req, res) {
        try {
            const settings = await SystemSetting_js_1.SystemSetting.find({});
            return res.json({ success: true, settings });
        }
        catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }
    static async updateSetting(req, res) {
        try {
            const { key, value, description, category } = req.body;
            const setting = await SystemSetting_js_1.SystemSetting.findOneAndUpdate({ key }, { value, description, category }, { upsert: true, new: true });
            return res.json({ success: true, setting });
        }
        catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }
}
exports.AdminController = AdminController;
