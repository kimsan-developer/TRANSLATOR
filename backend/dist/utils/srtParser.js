"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseSecondsToSrtTime = parseSecondsToSrtTime;
exports.parseSrtTimeToSeconds = parseSrtTimeToSeconds;
exports.parseSrt = parseSrt;
exports.buildSrt = buildSrt;
exports.buildVtt = buildVtt;
function parseSecondsToSrtTime(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const milliseconds = Math.min(999, Math.round((totalSeconds - Math.floor(totalSeconds)) * 1000));
    const pad = (n, z = 2) => String(n).padStart(z, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${pad(milliseconds, 3)}`;
}
function parseSrtTimeToSeconds(timeStr) {
    if (!timeStr)
        return 0;
    const normalized = timeStr.trim().replace('.', ',');
    const parts = normalized.split(':');
    if (parts.length < 2)
        return 0;
    let hours = 0;
    let minutes = 0;
    let secondsAndMillis = '';
    if (parts.length === 3) {
        hours = parseInt(parts[0], 10);
        minutes = parseInt(parts[1], 10);
        secondsAndMillis = parts[2];
    }
    else {
        minutes = parseInt(parts[0], 10);
        secondsAndMillis = parts[1];
    }
    const [secStr, msStr = '0'] = secondsAndMillis.split(',');
    const seconds = parseInt(secStr, 10);
    const ms = parseInt(msStr.padEnd(3, '0').slice(0, 3), 10);
    return hours * 3600 + minutes * 60 + seconds + ms / 1000;
}
function parseSrt(content) {
    const segments = [];
    const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const blocks = normalized.split(/\n\s*\n/).filter((b) => b.trim().length > 0);
    let fallbackId = 1;
    for (const block of blocks) {
        const lines = block.trim().split('\n');
        if (lines.length < 2)
            continue;
        let timeLineIndex = 1;
        let id = parseInt(lines[0].trim(), 10);
        if (isNaN(id)) {
            id = fallbackId;
            timeLineIndex = 0;
        }
        const timeLine = lines[timeLineIndex];
        if (!timeLine || !timeLine.includes('-->'))
            continue;
        const [startStr, endStr] = timeLine.split('-->').map((s) => s.trim());
        const start = parseSrtTimeToSeconds(startStr);
        const end = parseSrtTimeToSeconds(endStr);
        const textLines = lines.slice(timeLineIndex + 1);
        const text = textLines.join('\n').trim();
        segments.push({
            id: id || fallbackId,
            start,
            end,
            text,
        });
        fallbackId++;
    }
    return segments;
}
function buildSrt(segments) {
    return segments
        .map((seg, idx) => {
        const startTime = parseSecondsToSrtTime(seg.start);
        const endTime = parseSecondsToSrtTime(seg.end);
        return `${idx + 1}\n${startTime} --> ${endTime}\n${seg.text}\n`;
    })
        .join('\n');
}
function buildVtt(segments) {
    const srtContent = buildSrt(segments);
    const vttContent = 'WEBVTT\n\n' + srtContent.replace(/,/g, '.');
    return vttContent;
}
