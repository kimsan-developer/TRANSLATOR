import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';

export class ElevenLabsProvider {
  /**
   * Synthesize speech using ElevenLabs API
   */
  public static async generateSpeech(params: {
    apiKey: string;
    text: string;
    voiceId: string;
    outputPath: string;
    modelId?: string;
  }): Promise<string> {
    const { apiKey, text, voiceId, outputPath, modelId = 'eleven_multilingual_v2' } = params;

    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
    const response = await axios.post(
      url,
      {
        text,
        model_id: modelId,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      },
      {
        headers: {
          'xi-api-key': apiKey,
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
   * Add / Clone a new voice profile using voice audio sample
   */
  public static async cloneVoice(params: {
    apiKey: string;
    name: string;
    sampleFilePath: string;
    description?: string;
  }): Promise<{ voiceId: string; name: string }> {
    const { apiKey, name, sampleFilePath, description = 'Voice cloned in Video Translator AI Pro' } = params;

    const form = new FormData();
    form.append('name', name);
    form.append('description', description);
    form.append('files', fs.createReadStream(sampleFilePath));

    const response = await axios.post('https://api.elevenlabs.io/v1/voices/add', form, {
      headers: {
        'xi-api-key': apiKey,
        ...form.getHeaders(),
      },
      timeout: 60000,
    });

    return {
      voiceId: response.data.voice_id,
      name,
    };
  }

  /**
   * Connection test
   */
  public static async testConnection(apiKey: string): Promise<boolean> {
    const res = await axios.get('https://api.elevenlabs.io/v1/user', {
      headers: { 'xi-api-key': apiKey },
      timeout: 10000,
    });
    return res.status === 200;
  }
}
