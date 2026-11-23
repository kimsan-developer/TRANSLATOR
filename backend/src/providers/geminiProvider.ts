import axios from 'axios';
import { ISubtitleSegment } from '../models/Subtitle.js';

export class GeminiProvider {
  /**
   * Translate subtitle segments using Google Gemini API
   */
  public static async translateSegments(params: {
    apiKey: string;
    segments: ISubtitleSegment[];
    sourceLang: string;
    targetLang: string;
    style?: 'formal' | 'casual';
    model?: string;
  }): Promise<{ segmentId: number; translatedText: string }[]> {
    const { apiKey, segments, sourceLang, targetLang, style = 'formal', model = 'gemini-1.5-flash' } = params;

    const prompt = `You are a professional audiovisual translator and dubbing adapter.
Translate these subtitle segments from language "${sourceLang}" to "${targetLang}".
Translation style: ${style}.
Rules:
1. Ensure the meaning is faithfully preserved while sounding natural and idiomatic in ${targetLang}.
2. Keep timing and length suitable for video subtitle readability.
3. Return ONLY a valid JSON array of objects with the exact format:
[
  { "segmentId": <number>, "translatedText": "<translated subtitle string>" }
]
Do not include any explanation or markdown formatting (no \`\`\`json).

Segments to translate:
${JSON.stringify(
  segments.map((s) => ({
    segmentId: s.id,
    text: s.text,
  })),
  null,
  2
)}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await axios.post(
      url,
      {
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000,
      }
    );

    const candidate = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidate) {
      throw new Error('Empty response from Google Gemini API');
    }

    const cleaned = candidate.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : parsed.translations || [];
  }

  /**
   * Connection test
   */
  public static async testConnection(apiKey: string): Promise<boolean> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const res = await axios.get(url, { timeout: 10000 });
    return res.status === 200;
  }
}
