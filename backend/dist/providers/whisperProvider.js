"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhisperProvider = void 0;
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const axios_1 = __importDefault(require("axios"));
const env_js_1 = require("../config/env.js");
class WhisperProvider {
    /**
     * Run transcription using Faster-Whisper via python CLI runner or local microservice
     */
    static async transcribe(params) {
        const { audioPath, language = 'auto', model = 'base', onProgress } = params;
        // 1. Try microservice if running
        try {
            if (onProgress)
                onProgress('Checking Faster-Whisper microservice...');
            const healthRes = await axios_1.default.get(`${env_js_1.config.TRANSCRIPTION_SERVICE_URL}/health`, { timeout: 2000 });
            if (healthRes.status === 200) {
                if (onProgress)
                    onProgress('Sending audio to Faster-Whisper microservice...');
                const FormData = (await import('form-data')).default;
                const fs = await import('fs');
                const form = new FormData();
                form.append('file', fs.createReadStream(audioPath));
                form.append('language', language);
                form.append('model', model);
                const res = await axios_1.default.post(`${env_js_1.config.TRANSCRIPTION_SERVICE_URL}/api/transcribe`, form, {
                    headers: form.getHeaders(),
                    timeout: 300000,
                });
                if (res.data && res.data.success) {
                    return res.data;
                }
            }
        }
        catch {
            // Microservice not running; fall back directly to Python CLI script
        }
        // 2. Direct Python script execution
        return new Promise((resolve, reject) => {
            if (onProgress)
                onProgress('Executing Faster-Whisper via local Python engine...');
            const scriptPath = path_1.default.resolve(__dirname, '../../../transcription-service/transcribe.py');
            const args = [
                scriptPath,
                '--audio', audioPath,
                '--language', language,
                '--model', model,
            ];
            const child = (0, child_process_1.spawn)(env_js_1.config.PYTHON_PATH, args, {
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
                }
                catch (err) {
                    reject(new Error(`Failed to parse Faster-Whisper output: ${err.message}. Raw output: ${stdoutData}`));
                }
            });
            child.on('error', (err) => {
                reject(new Error(`Failed to spawn Python process: ${err.message}`));
            });
        });
    }
}
exports.WhisperProvider = WhisperProvider;
