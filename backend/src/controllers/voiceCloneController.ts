import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { VoiceProfile } from '../models/VoiceProfile.js';
import { AIProvider } from '../models/AIProvider.js';
import { ElevenLabsProvider } from '../providers/elevenlabsProvider.js';
import { decryptApiKey } from '../utils/crypto.js';
import ffmpeg from 'fluent-ffmpeg';

export class VoiceCloneController {
  public static async listProfiles(req: AuthRequest, res: Response) {
    try {
      const query: any = req.user?.role === 'superadmin' ? {} : { userId: req.user?.userId };
      const profiles = await VoiceProfile.find(query).sort({ createdAt: -1 });
      return res.json({ success: true, profiles });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async createProfile(req: AuthRequest, res: Response) {
    try {
      const file = req.file;
      const { name, language = 'en', gender = 'neutral', provider = 'local', consentAgreed } = req.body;

      if (!file) {
        return res.status(400).json({ success: false, error: 'Voice audio sample is required' });
      }

      // Mandatory explicit consent check
      if (consentAgreed !== 'true' && consentAgreed !== true) {
        return res.status(400).json({
          success: false,
          error: 'Explicit authorization and consent is required for creating a voice profile',
        });
      }

      // Probe audio sample duration
      const duration: number = await new Promise((resolve) => {
        ffmpeg.ffprobe(file.path, (err, metadata) => {
          resolve(metadata?.format?.duration || 0);
        });
      });

      let externalVoiceId = undefined;

      // If ElevenLabs is chosen and configured, register sample with ElevenLabs API
      if (provider === 'elevenlabs') {
        const prov = await AIProvider.findOne({ type: 'elevenlabs' });
        const apiKey = prov?.apiKeyEncrypted ? decryptApiKey(prov.apiKeyEncrypted) : process.env.ELEVENLABS_API_KEY;
        if (apiKey) {
          try {
            const elRes = await ElevenLabsProvider.cloneVoice({
              apiKey,
              name,
              sampleFilePath: file.path,
            });
            externalVoiceId = elRes.voiceId;
          } catch (elErr: any) {
            console.warn('ElevenLabs API clone error:', elErr.message);
          }
        }
      }

      const profile = await VoiceProfile.create({
        userId: req.user?.userId,
        name,
        language,
        gender,
        samplePath: `/uploads/voices/${file.filename}`,
        sampleDuration: Math.round(duration),
        provider,
        voiceId: externalVoiceId || `local_clone_${Date.now()}`,
        consentAgreed: true,
        status: 'ready',
      });

      return res.status(201).json({ success: true, profile });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async deleteProfile(req: AuthRequest, res: Response) {
    try {
      const profile = await VoiceProfile.findById(req.params.id);
      if (!profile) return res.status(404).json({ success: false, error: 'Voice profile not found' });

      if (req.user?.role !== 'superadmin' && profile.userId.toString() !== req.user?.userId) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }

      await profile.deleteOne();
      return res.json({ success: true, message: 'Voice profile deleted' });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}
