import { Router } from 'express';
import { AuthController } from '../controllers/authController.js';
import { ProjectController } from '../controllers/projectController.js';
import { VideoController } from '../controllers/videoController.js';
import { TranscriptionController } from '../controllers/transcriptionController.js';
import { TranslationController } from '../controllers/translationController.js';
import { SubtitleController } from '../controllers/subtitleController.js';
import { TtsController } from '../controllers/ttsController.js';
import { VoiceCloneController } from '../controllers/voiceCloneController.js';
import { EditorController } from '../controllers/editorController.js';
import { ExportController } from '../controllers/exportController.js';
import { ProviderController } from '../controllers/providerController.js';
import { AdminController } from '../controllers/adminController.js';
import { HistoryController } from '../controllers/historyController.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import { uploadMedia } from '../middleware/uploadMiddleware.js';

const router = Router();

// 1. Auth routes
router.post('/auth/register', AuthController.register);
router.post('/auth/login', AuthController.login);
router.post('/auth/refresh', AuthController.refresh);
router.get('/auth/me', requireAuth, AuthController.me);
router.put('/auth/profile', requireAuth, AuthController.updateProfile);
router.post('/auth/forgot-password', AuthController.forgotPassword);

// 2. Dashboard & Projects routes
router.get('/projects/dashboard/stats', requireAuth, ProjectController.getDashboardStats);
router.get('/projects', requireAuth, ProjectController.list);
router.post('/projects', requireAuth, ProjectController.create);
router.get('/projects/:id', requireAuth, ProjectController.getById);
router.put('/projects/:id', requireAuth, ProjectController.update);
router.delete('/projects/:id', requireAuth, ProjectController.delete);

// 3. Video Upload & Metadata
router.post('/videos/upload', requireAuth, uploadMedia.single('video'), VideoController.upload);
router.get('/videos/:id/metadata', requireAuth, VideoController.getMetadata);

// 4. Transcription routes
router.post('/transcription/start', requireAuth, TranscriptionController.startTranscription);
router.get('/transcription/export', requireAuth, TranscriptionController.exportFormat);

// 5. Translation routes
router.post('/translation/start', requireAuth, TranslationController.startTranslation);

// 6. Subtitles routes
router.get('/subtitles', requireAuth, SubtitleController.getSubtitles);
router.put('/subtitles/update', requireAuth, SubtitleController.updateSubtitles);
router.post('/subtitles/import', requireAuth, uploadMedia.single('subtitle'), SubtitleController.importFile);
router.post('/subtitles/split', requireAuth, SubtitleController.splitSegment);
router.post('/subtitles/merge', requireAuth, SubtitleController.mergeSegments);

// 7. AI Voice Generator & Dubbing
router.get('/tts/voices', requireAuth, TtsController.listVoices);
router.post('/tts/preview', requireAuth, TtsController.previewVoice);
router.post('/tts/dub', requireAuth, TtsController.generateDubbing);

// 8. Voice Cloning routes
router.get('/voice-clones', requireAuth, VoiceCloneController.listProfiles);
router.post('/voice-clones/create', requireAuth, uploadMedia.single('voiceSample'), VoiceCloneController.createProfile);
router.delete('/voice-clones/:id', requireAuth, VoiceCloneController.deleteProfile);

// 9. Video Editor & Audio Sync
router.get('/editor/:projectId/timeline', requireAuth, EditorController.getTimelineData);
router.put('/editor/track-settings', requireAuth, EditorController.updateTrackSettings);

// 10. Video Export
router.post('/export/start', requireAuth, ExportController.startExport);
router.get('/export/:id/status', requireAuth, ExportController.getExportStatus);
router.post('/export/cancel', requireAuth, ExportController.cancelExport);
router.get('/export/:id/download', ExportController.downloadFile); // Public/Authorized download

// 11. AI Provider Manager
router.get('/providers', requireAuth, ProviderController.listProviders);
router.put('/providers/:id', requireAuth, ProviderController.updateProvider);
router.post('/providers/:id/test', requireAuth, ProviderController.testProvider);

// 12. Admin Panel
router.get('/admin/users', requireAuth, requireRole(['superadmin', 'admin']), AdminController.listUsers);
router.put('/admin/users/:id/role', requireAuth, requireRole(['superadmin']), AdminController.updateUserRole);
router.get('/admin/jobs', requireAuth, requireRole(['superadmin', 'admin']), AdminController.getAllJobs);
router.get('/admin/metrics', requireAuth, requireRole(['superadmin', 'admin']), AdminController.getSystemMetrics);
router.get('/admin/settings', requireAuth, requireRole(['superadmin', 'admin']), AdminController.getSettings);
router.post('/admin/settings', requireAuth, requireRole(['superadmin']), AdminController.updateSetting);

// 13. Usage History
router.get('/history', requireAuth, HistoryController.listUsage);

export default router;
