import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseSecondsToSrtTime,
  parseSrtTimeToSeconds,
  parseSrt,
  buildSrt,
  buildVtt,
} from '../backend/dist/utils/srtParser.js';

test('SRT Parser: Timestamp conversions', () => {
  const seconds = 75.52;
  const srtTime = parseSecondsToSrtTime(seconds);
  assert.equal(srtTime, '00:01:15,520');

  const parsedBack = parseSrtTimeToSeconds(srtTime);
  assert.equal(Math.abs(parsedBack - seconds) < 0.01, true);
});

test('SRT Parser: Parse and Build SRT/VTT', () => {
  const sampleSrt = `1
00:00:01,000 --> 00:00:03,500
Hello world, welcome to AI Video Dubbing.

2
00:00:04,000 --> 00:00:07,200
This is a high accuracy subtitle segment.
`;

  const segments = parseSrt(sampleSrt);
  assert.equal(segments.length, 2);
  assert.equal(segments[0].id, 1);
  assert.equal(segments[0].start, 1.0);
  assert.equal(segments[0].end, 3.5);
  assert.equal(segments[0].text, 'Hello world, welcome to AI Video Dubbing.');

  const generatedSrt = buildSrt(segments);
  assert.ok(generatedSrt.includes('Hello world, welcome to AI Video Dubbing.'));

  const generatedVtt = buildVtt(segments);
  assert.ok(generatedVtt.startsWith('WEBVTT'));
  assert.ok(generatedVtt.includes('00:00:01.000 --> 00:00:03.500'));
});
