import { spawn } from 'child_process';
import path from 'path';
import axios from 'axios';
import { config } from '../config/env.js';
import { ISubtitleSegment } from '../models/Subtitle.js';

export interface WhisperTranscriptionResult {
  success: boolean;
  detected_language: string;
  language_probability: number;
  duration: number;
  segments: ISubtitleSegment[];
  full_text: string;
  error?: string;
}

export class WhisperProvider {
  /**
   * Run transcription using Faster-Whisper via python CLI runner or local microservice
   */
  public static async transcribe(params: {
    audioPath: string;
    language?: string;
    model?: string;
    onProgress?: (step: string) => void;
  }): Promise<WhisperTranscriptionResult> {
    const { audioPath, language = 'auto', model = 'base', onProgress } = params;

    // 1. Try microservice if running
    try {
      if (onProgress) onProgress('Checking Faster-Whisper microservice...');
      const healthRes = await axios.get(`${config.TRANSCRIPTION_SERVICE_URL}/health`, { timeout: 2000 });
      if (healthRes.status === 200) {
        if (onProgress) onProgress('Sending audio to Faster-Whisper microservice...');
        const FormData = (await import('form-data')).default;
        const fs = await import('fs');
        const form = new FormData();
        form.append('file', fs.createReadStream(audioPath));
        form.append('language', language);
        form.append('model', model);

        const res = await axios.post(`${config.TRANSCRIPTION_SERVICE_URL}/api/transcribe`, form, {
          headers: form.getHeaders(),
          timeout: 300000,
        });

        if (res.data && res.data.success) {
          return res.data;
        }
      }
    } catch {
      // Microservice not running; fall back directly to Python CLI script
    }

    // 2. Direct Python script execution
    return new Promise((resolve, reject) => {
      if (onProgress) onProgress('Executing Faster-Whisper via local Python engine...');
      const scriptPath = path.resolve(__dirname, '../../../transcription-service/transcribe.py');

      const args = [
        scriptPath,
        '--audio', audioPath,
        '--language', language,
        '--model', model,
      ];

      const child = spawn(config.PYTHON_PATH, args, {
        windowsHide: true,
      });

      let stdoutData = '';
      let stderrData = '';

      child.stdout.on('data', (chunk) => {
        stdoutData += chunk.toString();
      });

      child.stderr.on('data', (chunk) => {
        stderrData += chunk.toString();
      });

      child.on('close', (code) => {
        if (code !== 0) {
          return reject(new Error(`Faster-Whisper process failed with code ${code}: ${stderrData}`));
        }

        try {
          const parsed = JSON.parse(stdoutData.trim());
          if (!parsed.success) {
            return reject(new Error(parsed.error || 'Faster-Whisper transcription failed'));
          }
          resolve(parsed);
        } catch (err: any) {
          reject(new Error(`Failed to parse Faster-Whisper output: ${err.message}. Raw output: ${stdoutData}`));
        }
      });

      child.on('error', (err) => {
        reject(new Error(`Failed to spawn Python process: ${err.message}`));
      });
    });
  }
}
