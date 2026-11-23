"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadMedia = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const storageService_js_1 = require("../services/storageService.js");
const env_js_1 = require("../config/env.js");
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        if (file.fieldname === 'video') {
            cb(null, storageService_js_1.storageService.getDirectory('videos'));
        }
        else if (file.fieldname === 'audio' || file.fieldname === 'bgMusic') {
            cb(null, storageService_js_1.storageService.getDirectory('audio'));
        }
        else if (file.fieldname === 'voiceSample') {
            cb(null, storageService_js_1.storageService.getDirectory('voices'));
        }
        else if (file.fieldname === 'subtitle') {
            cb(null, storageService_js_1.storageService.getDirectory('subtitles'));
        }
        else {
            cb(null, storageService_js_1.storageService.getDirectory('temp'));
        }
    },
    filename: (req, file, cb) => {
        const ext = path_1.default.extname(file.originalname).toLowerCase();
        const uniqueName = `${(0, uuid_1.v4)()}${ext}`;
        cb(null, uniqueName);
    },
});
exports.uploadMedia = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: env_js_1.config.MAX_FILE_SIZE_MB * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
        const allowedVideoExts = ['.mp4', '.mkv', '.mov', '.avi', '.webm', '.m4v'];
        const allowedAudioExts = ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac'];
        const allowedSubExts = ['.srt', '.vtt'];
        const ext = path_1.default.extname(file.originalname).toLowerCase();
        if (file.fieldname === 'video' && !allowedVideoExts.includes(ext)) {
            return cb(new Error(`Invalid video format. Allowed: ${allowedVideoExts.join(', ')}`));
        }
        if ((file.fieldname === 'audio' || file.fieldname === 'voiceSample' || file.fieldname === 'bgMusic') && !allowedAudioExts.includes(ext)) {
            return cb(new Error(`Invalid audio format. Allowed: ${allowedAudioExts.join(', ')}`));
        }
        if (file.fieldname === 'subtitle' && !allowedSubExts.includes(ext)) {
            return cb(new Error(`Invalid subtitle format. Allowed: ${allowedSubExts.join(', ')}`));
        }
        cb(null, true);
    },
});
