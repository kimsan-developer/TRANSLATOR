"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_js_1 = require("../controllers/authController.js");
const projectController_js_1 = require("../controllers/projectController.js");
const videoController_js_1 = require("../controllers/videoController.js");
const transcriptionController_js_1 = require("../controllers/transcriptionController.js");
const translationController_js_1 = require("../controllers/translationController.js");
const subtitleController_js_1 = require("../controllers/subtitleController.js");
const ttsController_js_1 = require("../controllers/ttsController.js");
const voiceCloneController_js_1 = require("../controllers/voiceCloneController.js");
const editorController_js_1 = require("../controllers/editorController.js");
const exportController_js_1 = require("../controllers/exportController.js");
const providerController_js_1 = require("../controllers/providerController.js");
const adminController_js_1 = require("../controllers/adminController.js");
const historyController_js_1 = require("../controllers/historyController.js");
const authMiddleware_js_1 = require("../middleware/authMiddleware.js");
const uploadMiddleware_js_1 = require("../middleware/uploadMiddleware.js");
const router = (0, express_1.Router)();
// 1. Auth routes
router.post('/auth/register', authController_js_1.AuthController.register);
router.post('/auth/login', authController_js_1.AuthController.login);
router.post('/auth/refresh', authController_js_1.AuthController.refresh);
router.get('/auth/me', authMiddleware_js_1.requireAuth, authController_js_1.AuthController.me);
router.put('/auth/profile', authMiddleware_js_1.requireAuth, authController_js_1.AuthController.updateProfile);
router.post('/auth/forgot-password', authController_js_1.AuthController.forgotPassword);
// 2. Dashboard & Projects routes
router.get('/projects/dashboard/stats', authMiddleware_js_1.requireAuth, projectController_js_1.ProjectController.getDashboardStats);
router.get('/projects', authMiddleware_js_1.requireAuth, projectController_js_1.ProjectController.list);
router.post('/projects', authMiddleware_js_1.requireAuth, projectController_js_1.ProjectController.create);
router.get('/projects/:id', authMiddleware_js_1.requireAuth, projectController_js_1.ProjectController.getById);
router.put('/projects/:id', authMiddleware_js_1.requireAuth, projectController_js_1.ProjectController.update);
router.delete('/projects/:id', authMiddleware_js_1.requireAuth, projectController_js_1.ProjectController.delete);
// 3. Video Upload & Metadata
router.post('/videos/upload', authMiddleware_js_1.requireAuth, uploadMiddleware_js_1.uploadMedia.single('video'), videoController_js_1.VideoController.upload);
router.get('/videos/:id/metadata', authMiddleware_js_1.requireAuth, videoController_js_1.VideoController.getMetadata);
// 4. Transcription routes
router.post('/transcription/start', authMiddleware_js_1.requireAuth, transcriptionController_js_1.TranscriptionController.startTranscription);
router.get('/transcription/export', authMiddleware_js_1.requireAuth, transcriptionController_js_1.TranscriptionController.exportFormat);
// 5. Translation routes
router.post('/translation/start', authMiddleware_js_1.requireAuth, translationController_js_1.TranslationController.startTranslation);
// 6. Subtitles routes
router.get('/subtitles', authMiddleware_js_1.requireAuth, subtitleController_js_1.SubtitleController.getSubtitles);
router.put('/subtitles/update', authMiddleware_js_1.requireAuth, subtitleController_js_1.SubtitleController.updateSubtitles);
router.post('/subtitles/import', authMiddleware_js_1.requireAuth, uploadMiddleware_js_1.uploadMedia.single('subtitle'), subtitleController_js_1.SubtitleController.importFile);
router.post('/subtitles/split', authMiddleware_js_1.requireAuth, subtitleController_js_1.SubtitleController.splitSegment);
router.post('/subtitles/merge', authMiddleware_js_1.requireAuth, subtitleController_js_1.SubtitleController.mergeSegments);
// 7. AI Voice Generator & Dubbing
router.get('/tts/voices', authMiddleware_js_1.requireAuth, ttsController_js_1.TtsController.listVoices);
router.post('/tts/preview', authMiddleware_js_1.requireAuth, ttsController_js_1.TtsController.previewVoice);
router.post('/tts/dub', authMiddleware_js_1.requireAuth, ttsController_js_1.TtsController.generateDubbing);
// 8. Voice Cloning routes
router.get('/voice-clones', authMiddleware_js_1.requireAuth, voiceCloneController_js_1.VoiceCloneController.listProfiles);
router.post('/voice-clones/create', authMiddleware_js_1.requireAuth, uploadMiddleware_js_1.uploadMedia.single('voiceSample'), voiceCloneController_js_1.VoiceCloneController.createProfile);
router.delete('/voice-clones/:id', authMiddleware_js_1.requireAuth, voiceCloneController_js_1.VoiceCloneController.deleteProfile);
// 9. Video Editor & Audio Sync
router.get('/editor/:projectId/timeline', authMiddleware_js_1.requireAuth, editorController_js_1.EditorController.getTimelineData);
router.put('/editor/track-settings', authMiddleware_js_1.requireAuth, editorController_js_1.EditorController.updateTrackSettings);
// 10. Video Export
router.post('/export/start', authMiddleware_js_1.requireAuth, exportController_js_1.ExportController.startExport);
router.get('/export/:id/status', authMiddleware_js_1.requireAuth, exportController_js_1.ExportController.getExportStatus);
router.post('/export/cancel', authMiddleware_js_1.requireAuth, exportController_js_1.ExportController.cancelExport);
router.get('/export/:id/download', exportController_js_1.ExportController.downloadFile); // Public/Authorized download
// 11. AI Provider Manager
router.get('/providers', authMiddleware_js_1.requireAuth, providerController_js_1.ProviderController.listProviders);
router.put('/providers/:id', authMiddleware_js_1.requireAuth, providerController_js_1.ProviderController.updateProvider);
router.post('/providers/:id/test', authMiddleware_js_1.requireAuth, providerController_js_1.ProviderController.testProvider);
// 12. Admin Panel
router.get('/admin/users', authMiddleware_js_1.requireAuth, (0, authMiddleware_js_1.requireRole)(['superadmin', 'admin']), adminController_js_1.AdminController.listUsers);
router.put('/admin/users/:id/role', authMiddleware_js_1.requireAuth, (0, authMiddleware_js_1.requireRole)(['superadmin']), adminController_js_1.AdminController.updateUserRole);
router.get('/admin/jobs', authMiddleware_js_1.requireAuth, (0, authMiddleware_js_1.requireRole)(['superadmin', 'admin']), adminController_js_1.AdminController.getAllJobs);
router.get('/admin/metrics', authMiddleware_js_1.requireAuth, (0, authMiddleware_js_1.requireRole)(['superadmin', 'admin']), adminController_js_1.AdminController.getSystemMetrics);
router.get('/admin/settings', authMiddleware_js_1.requireAuth, (0, authMiddleware_js_1.requireRole)(['superadmin', 'admin']), adminController_js_1.AdminController.getSettings);
router.post('/admin/settings', authMiddleware_js_1.requireAuth, (0, authMiddleware_js_1.requireRole)(['superadmin']), adminController_js_1.AdminController.updateSetting);
// 13. Usage History
router.get('/history', authMiddleware_js_1.requireAuth, historyController_js_1.HistoryController.listUsage);
exports.default = router;
