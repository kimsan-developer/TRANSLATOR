import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { config } from '../config/env.js';

export interface VoiceOption {
  name: string;
  displayName: string;
  gender: string;
  locale: string;
}

export class EdgeTtsProvider {
  /**
   * Pre-configured high quality neural voice library for major languages
   */
  public static readonly VOICES: Record<string, { male: string; female: string; displayName: string }> = {
    en: { male: 'en-US-ChristopherNeural', female: 'en-US-JennyNeural', displayName: 'English (US)' },
    km: { male: 'km-KH-PisethNeural', female: 'km-KH-SreymomNeural', displayName: 'Khmer (Cambodia)' },
    th: { male: 'th-TH-NiwatNeural', female: 'th-TH-PremwadeeNeural', displayName: 'Thai' },
    vi: { male: 'vi-VN-NamMinhNeural', female: 'vi-VN-HoaiMyNeural', displayName: 'Vietnamese' },
    zh: { male: 'zh-CN-YunxiNeural', female: 'zh-CN-XiaoxiaoNeural', displayName: 'Chinese (Mandarin)' },
    ja: { male: 'ja-JP-KeitaNeural', female: 'ja-JP-NanamiNeural', displayName: 'Japanese' },
    ko: { male: 'ko-KR-InJoonNeural', female: 'ko-KR-SunHiNeural', displayName: 'Korean' },
    fr: { male: 'fr-FR-HenriNeural', female: 'fr-FR-DeniseNeural', displayName: 'French' },
    es: { male: 'es-ES-AlvaroNeural', female: 'es-ES-ElviraNeural', displayName: 'Spanish' },
    de: { male: 'de-DE-ConradNeural', female: 'de-DE-KatjaNeural', displayName: 'German' },
  };

  /**
   * Synthesize audio from text using Edge TTS (multilingual, zero-key)
   */
  public static async generateAudio(params: {
    text: string;
    outputPath: string;
    voice?: string;
    rate?: string; // e.g. "+0%", "+10%", "-10%"
    pitch?: string; // e.g. "+0Hz", "+5Hz"
  }): Promise<string> {
    const { text, outputPath, voice = 'en-US-JennyNeural', rate = '+0%', pitch = '+0Hz' } = params;

    return new Promise((resolve, reject) => {
      const scriptPath = path.resolve(__dirname, '../../../transcription-service/tts.py');
      const args = [
        scriptPath,
        '--text', text,
        '--output', outputPath,
        '--voice', voice,
        '--rate', rate,
        '--pitch', pitch,
      ];

      const child = spawn(config.PYTHON_PATH, args, { windowsHide: true });
      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (d) => (stdout += d.toString()));
      child.stderr.on('data', (d) => (stderr += d.toString()));

      child.on('close', (code) => {
        if (code !== 0) {
          return reject(new Error(`Edge TTS generation failed (code ${code}): ${stderr}`));
        }

        try {
          const res = JSON.parse(stdout.trim());
          if (!res.success) {
            return reject(new Error(res.error || 'Edge TTS error'));
          }
          resolve(outputPath);
        } catch {
          if (fs.existsSync(outputPath)) {
            return resolve(outputPath);
          }
          reject(new Error(`Failed to parse Edge TTS output: ${stdout}`));
        }
      });

      child.on('error', (err) => reject(new Error(`Cannot spawn Python for Edge TTS: ${err.message}`)));
    });
  }

  /**
   * Resolve default voice for language code
   */
  public static getDefaultVoice(lang: string, gender: 'male' | 'female' = 'female'): string {
    const mapping = this.VOICES[lang.toLowerCase()];
    if (mapping) {
      return gender === 'male' ? mapping.male : mapping.female;
    }
    return 'en-US-JennyNeural';
  }
}
