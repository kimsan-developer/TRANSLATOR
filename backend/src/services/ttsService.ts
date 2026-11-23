import path from 'path';
import fs from 'fs';
import { EdgeTtsProvider } from '../providers/edgeTtsProvider.js';
import { OpenAIProvider } from '../providers/openaiProvider.js';
import { ElevenLabsProvider } from '../providers/elevenlabsProvider.js';
import { storageService } from './storageService.js';
import { AIProvider } from '../models/AIProvider.js';
import { decryptApiKey } from '../utils/crypto.js';
import { ISubtitleSegment } from '../models/Subtitle.js';
import ffmpeg from 'fluent-ffmpeg';

export class TtsService {
  /**
   * Synthesize audio file for text segment or full text
   */
  public static async synthesizeSpeech(params: {
    text: string;
    targetLang: string;
    voiceId?: string;
    gender?: 'male' | 'female';
    providerType?: 'edge-tts' | 'openai' | 'elevenlabs';
    rate?: string;
    pitch?: string;
    filenamePrefix?: string;
  }): Promise<{ filename: string; filePath: string; duration: number }> {
    const {
      text,
      targetLang,
      voiceId,
      gender = 'female',
      providerType = 'edge-tts',
      rate = '+0%',
      pitch = '+0Hz',
      filenamePrefix = 'tts',
    } = params;

    const filename = `${filenamePrefix}_${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`;
    const audioDir = storageService.getDirectory('audio');
    const outputPath = path.join(audioDir, filename);

    if (providerType === 'openai') {
      const providerDoc = await AIProvider.findOne({ type: 'openai' });
      const apiKey = providerDoc?.apiKeyEncrypted ? decryptApiKey(providerDoc.apiKeyEncrypted) : process.env.OPENAI_API_KEY;
      if (!apiKey) throw new Error('OpenAI API Key is not configured');
      await OpenAIProvider.generateSpeech({
        apiKey,
        text,
        voice: voiceId || 'nova',
        outputPath,
      });
    } else if (providerType === 'elevenlabs') {
      const providerDoc = await AIProvider.findOne({ type: 'elevenlabs' });
      const apiKey = providerDoc?.apiKeyEncrypted ? decryptApiKey(providerDoc.apiKeyEncrypted) : process.env.ELEVENLABS_API_KEY;
      if (!apiKey) throw new Error('ElevenLabs API Key is not configured');
      await ElevenLabsProvider.generateSpeech({
        apiKey,
        text,
        voiceId: voiceId || '21m00Tcm4TlvDq8ikWAM', // default Rachel
        outputPath,
      });
    } else {
      // Default: Edge TTS (multilingual, zero external key required)
      const selectedVoice = voiceId || EdgeTtsProvider.getDefaultVoice(targetLang, gender);
      await EdgeTtsProvider.generateAudio({
        text,
        outputPath,
        voice: selectedVoice,
        rate,
        pitch,
      });
    }

    // Probe duration
    const duration = await this.getAudioDuration(outputPath);

    return {
      filename,
      filePath: outputPath,
      duration,
    };
  }

  /**
   * Synthesize and assemble multilingual audio for all subtitle segments
   */
  public static async synthesizeSubtitlesToTrack(params: {
    segments: ISubtitleSegment[];
    targetLang: string;
    voiceId?: string;
    gender?: 'male' | 'female';
    providerType?: 'edge-tts' | 'openai' | 'elevenlabs';
    totalVideoDuration: number;
    outputFilename: string;
    onProgress?: (progress: number, step: string) => void;
  }): Promise<{ filename: string; filePath: string; duration: number }> {
    const {
      segments,
      targetLang,
      voiceId,
      gender = 'female',
      providerType = 'edge-tts',
      totalVideoDuration,
      outputFilename,
      onProgress,
    } = params;

    const tempDir = storageService.getDirectory('temp');
    const segmentAudioFiles: { path: string; start: number; end: number; duration: number }[] = [];

    // 1. Generate audio for each segment
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      if (onProgress) {
        const percent = Math.round((i / segments.length) * 70);
        onProgress(percent, `Generating AI voice for segment ${i + 1}/${segments.length}...`);
      }

      if (!seg.text.trim()) continue;

      const segFilename = `seg_${i}_${Date.now()}.mp3`;
      const segPath = path.join(tempDir, segFilename);

      try {
        const selectedVoice = voiceId || EdgeTtsProvider.getDefaultVoice(targetLang, gender);
        await EdgeTtsProvider.generateAudio({
          text: seg.text,
          outputPath: segPath,
          voice: selectedVoice,
        });

        const duration = await this.getAudioDuration(segPath);
        segmentAudioFiles.push({
          path: segPath,
          start: seg.start,
          end: seg.end,
          duration,
        });
      } catch (err) {
        console.warn(`Failed to synthesize segment ${i + 1}:`, err);
      }
    }

    if (onProgress) {
      onProgress(75, 'Assembling synchronized full dubbed audio track...');
    }

    // 2. Mix into continuous audio track with silence padding to match video timeline
    const audioDir = storageService.getDirectory('audio');
    const finalTrackPath = path.join(audioDir, outputFilename);

    await this.assembleTimelineAudio({
      audioFiles: segmentAudioFiles,
      totalDuration: totalVideoDuration,
      outputPath: finalTrackPath,
    });

    // Cleanup temp segment files
    for (const item of segmentAudioFiles) {
      storageService.deleteFile(item.path);
    }

    const duration = await this.getAudioDuration(finalTrackPath);

    return {
      filename: outputFilename,
      filePath: finalTrackPath,
      duration,
    };
  }

  private static async getAudioDuration(filePath: string): Promise<number> {
    return new Promise((resolve) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err || !metadata.format.duration) return resolve(0);
        resolve(Number(metadata.format.duration));
      });
    });
  }

  /**
   * Build complete time-synchronized audio track using FFmpeg filter_complex
   */
  private static async assembleTimelineAudio(params: {
    audioFiles: { path: string; start: number; duration: number }[];
    totalDuration: number;
    outputPath: string;
  }): Promise<string> {
    const { audioFiles, totalDuration, outputPath } = params;

    return new Promise((resolve, reject) => {
      if (audioFiles.length === 0) {
        // Generate blank silence if no segments
        ffmpeg()
          .input(`anullsrc=r=44100:cl=stereo`)
          .inputFormat('lavfi')
          .duration(Math.max(1, totalDuration))
          .output(outputPath)
          .on('end', () => resolve(outputPath))
          .on('error', (e) => reject(e))
          .run();
        return;
      }

      let cmd = ffmpeg();
      // Input 0: base silence of video duration
      cmd.input(`anullsrc=r=44100:cl=stereo`).inputFormat('lavfi').duration(Math.max(1, totalDuration));

      const filterParts: string[] = [];
      const amixInputs: string[] = ['[0:a]'];

      audioFiles.forEach((file, index) => {
        cmd.input(file.path);
        const inputIdx = index + 1;
        const delayMs = Math.round(file.start * 1000);
        const delayedTag = `[d${index}]`;

        filterParts.push(`[${inputIdx}:a]adelay=${delayMs}|${delayMs}${delayedTag}`);
        amixInputs.push(delayedTag);
      });

      filterParts.push(`${amixInputs.join('')}amix=inputs=${amixInputs.length}:dropout_transition=0:normalize=0[aout]`);

      cmd
        .complexFilter(filterParts)
        .map('[aout]')
        .audioCodec('libmp3lame')
        .audioBitrate(192)
        .output(outputPath)
        .on('end', () => resolve(outputPath))
        .on('error', (err) => reject(err))
        .run();
    });
  }
}
