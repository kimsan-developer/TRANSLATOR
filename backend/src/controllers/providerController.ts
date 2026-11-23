import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { AIProvider } from '../models/AIProvider.js';
import { encryptApiKey, maskApiKey, decryptApiKey } from '../utils/crypto.js';
import { OpenAIProvider } from '../providers/openaiProvider.js';
import { GeminiProvider } from '../providers/geminiProvider.js';
import { ElevenLabsProvider } from '../providers/elevenlabsProvider.js';

export class ProviderController {
  public static async listProviders(req: AuthRequest, res: Response) {
    try {
      const providers = await AIProvider.find({});
      const sanitized = providers.map((p) => ({
        id: p._id,
        name: p.name,
        type: p.type,
        models: p.models,
        selectedModel: p.selectedModel,
        enabled: p.enabled,
        isDefault: p.isDefault,
        status: p.status,
        lastTestedAt: p.lastTestedAt,
        usageCount: p.usageCount,
        hasKey: !!p.apiKeyEncrypted,
        keyMasked: p.apiKeyEncrypted ? maskApiKey(decryptApiKey(p.apiKeyEncrypted)) : '',
      }));
      return res.json({ success: true, providers: sanitized });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async updateProvider(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { apiKey, selectedModel, enabled, isDefault } = req.body;

      const provider = await AIProvider.findById(id);
      if (!provider) return res.status(404).json({ success: false, error: 'Provider not found' });

      if (apiKey !== undefined && apiKey.trim() !== '') {
        provider.apiKeyEncrypted = encryptApiKey(apiKey.trim());
        provider.status = 'online';
      }
      if (selectedModel) provider.selectedModel = selectedModel;
      if (enabled !== undefined) provider.enabled = enabled;
      if (isDefault !== undefined) {
        if (isDefault) {
          await AIProvider.updateMany({ type: provider.type }, { isDefault: false });
        }
        provider.isDefault = isDefault;
      }

      await provider.save();
      return res.json({ success: true, message: 'Provider updated' });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async testProvider(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const provider = await AIProvider.findById(id);
      if (!provider) return res.status(404).json({ success: false, error: 'Provider not found' });

      const rawKey = provider.apiKeyEncrypted ? decryptApiKey(provider.apiKeyEncrypted) : '';
      let testPassed = false;
      let errorMsg = '';

      try {
        if (provider.type === 'openai') {
          if (!rawKey) throw new Error('API key not configured');
          testPassed = await OpenAIProvider.testConnection(rawKey);
        } else if (provider.type === 'gemini') {
          if (!rawKey) throw new Error('API key not configured');
          testPassed = await GeminiProvider.testConnection(rawKey);
        } else if (provider.type === 'elevenlabs') {
          if (!rawKey) throw new Error('API key not configured');
          testPassed = await ElevenLabsProvider.testConnection(rawKey);
        } else if (provider.type === 'whisper' || provider.type === 'edge-tts' || provider.type === 'local') {
          testPassed = true;
        }
      } catch (e: any) {
        errorMsg = e.response?.data?.error?.message || e.message;
        testPassed = false;
      }

      provider.lastTestedAt = new Date();
      provider.status = testPassed ? 'online' : 'error';
      await provider.save();

      return res.json({
        success: testPassed,
        status: provider.status,
        message: testPassed ? 'Connection verified successfully!' : `Connection failed: ${errorMsg}`,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}
