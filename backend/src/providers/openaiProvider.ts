import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';
import { ISubtitleSegment } from '../models/Subtitle.js';

export class OpenAIProvider {
  /**
   * Translate subtitle segments using OpenAI GPT-4o / GPT-4o-mini
   */
  public static async translateSegments(params: {
    apiKey: string;
    segments: ISubtitleSegment[];
    sourceLang: string;
    targetLang: string;
    style?: 'formal' | 'casual';
    model?: string;
  }): Promise<{ segmentId: number; translatedText: string }[]> {
    const { apiKey, segments, sourceLang, targetLang, style = 'formal', model = 'gpt-4o-mini' } = params;

    const systemPrompt = `You are an expert audiovisual translator and dubbing adapter.
Translate the following subtitle segments from ${sourceLang} to ${targetLang}.
Style requirement: ${style}.
Guidelines:
1. Maintain natural conversational flow and synchronization. Keep translated duration comparable to original speech.
2. Preserve numbers, acronyms, and names accurately.
3. Return STRICTLY a valid JSON array of objects with structure:
[
  { "segmentId": <number>, "translatedText": "<translated subtitle string>" }
]
Do not wrap in markdown or backticks. Return raw JSON.`;

    const userContent = JSON.stringify(
      segments.map((s) => ({
        segmentId: s.id,
        text: s.text,
      }))
    );

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 60000,
      }
    );

    const raw = response.data.choices[0].message.content;
    const parsed = JSON.parse(raw);
    const result = Array.isArray(parsed) ? parsed : parsed.translations || parsed.segments || [];
    return result;
  }

  /**
   * Transcribe audio using OpenAI Whisper API
   */
  public static async transcribeAudio(params: {
    apiKey: string;
    audioFilePath: string;
    language?: string;
  }): Promise<{ text: string; segments: ISubtitleSegment[] }> {
    const { apiKey, audioFilePath, language } = params;
    const form = new FormData();
    form.append('file', fs.createReadStream(audioFilePath));
    form.append('model', 'whisper-1');
    form.append('response_format', 'verbose_json');
    if (language && language !== 'auto') {
      form.append('language', language);
    }

    const response = await axios.post('https://api.openai.com/v1/audio/transcriptions', form, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        ...form.getHeaders(),
      },
      maxBodyLength: Infinity,
      timeout: 120000,
    });

    const data = response.data;
    const segments: ISubtitleSegment[] = (data.segments || []).map((seg: any, idx: number) => ({
      id: idx + 1,
      start: seg.start,
      end: seg.end,
      text: seg.text.trim(),
      confidence: 0.95,
    }));

    return {
      text: data.text,
      segments,
    };
  }

  /**
   * Synthesize speech using OpenAI TTS API
   */
  public static async generateSpeech(params: {
    apiKey: string;
    text: string;
    voice?: string; // alloy, echo, fable, onyx, nova, shimmer
    outputPath: string;
  }): Promise<string> {
    const { apiKey, text, voice = 'nova', outputPath } = params;

    const response = await axios.post(
      'https://api.openai.com/v1/audio/speech',
      {
        model: 'tts-1',
        input: text,
        voice,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        responseType: 'arraybuffer',
        timeout: 60000,
      }
    );

    fs.writeFileSync(outputPath, Buffer.from(response.data));
    return outputPath;
  }

  /**
   * Connection test
   */
  public static async testConnection(apiKey: string): Promise<boolean> {
    const res = await axios.get('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
      timeout: 10000,
    });
    return res.status === 200;
  }
}
