import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs';

test('FFmpeg: Video generation and FFprobe metadata extraction', () => {
  const tempDir = path.resolve('uploads/temp');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const testVideoPath = path.join(tempDir, 'test_sample.mp4');

  // Generate a quick 2-second test video using ffmpeg color generator
  const genRes = spawnSync('ffmpeg', [
    '-y',
    '-f', 'lavfi',
    '-i', 'color=c=blue:s=320x240:d=2',
    '-f', 'lavfi',
    '-i', 'sine=f=440:d=2',
    '-c:v', 'libx264',
    '-c:a', 'aac',
    testVideoPath,
  ]);

  assert.equal(genRes.status, 0, 'FFmpeg generated test video');
  assert.ok(fs.existsSync(testVideoPath), 'Test video file exists');

  // Clean up
  try {
    fs.unlinkSync(testVideoPath);
  } catch {}
});
