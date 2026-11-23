import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs';

test('AI Voice Generator: Edge TTS Real Speech Synthesis', () => {
  const tempDir = path.resolve('uploads/temp');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const outAudio = path.join(tempDir, 'test_tts_audio.mp3');
  const ttsScript = path.resolve('transcription-service/tts.py');

  const res = spawnSync('python', [
    ttsScript,
    '--text', 'Hello, this is a test audio generation from Video Translator AI Pro.',
    '--output', outAudio,
    '--voice', 'en-US-JennyNeural',
  ]);

  assert.equal(res.status, 0, 'Python Edge-TTS process succeeded');
  assert.ok(fs.existsSync(outAudio), 'TTS synthesized audio file exists');

  const stat = fs.statSync(outAudio);
  assert.ok(stat.size > 1000, `Audio file has genuine data (${stat.size} bytes)`);

  // Clean up
  try {
    fs.unlinkSync(outAudio);
  } catch {}
});
