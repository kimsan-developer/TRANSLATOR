"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.storageService = exports.StorageService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const env_js_1 = require("../config/env.js");
class StorageService {
    baseDir;
    constructor() {
        this.baseDir = env_js_1.config.STORAGE_DIR;
        this.ensureDirs();
    }
    ensureDirs() {
        const subdirs = ['videos', 'audio', 'subtitles', 'thumbnails', 'exports', 'voices', 'temp'];
        for (const sub of subdirs) {
            const dirPath = path_1.default.join(this.baseDir, sub);
            if (!fs_1.default.existsSync(dirPath)) {
                fs_1.default.mkdirSync(dirPath, { recursive: true });
            }
        }
    }
    getDirectory(type) {
        const dir = path_1.default.join(this.baseDir, type);
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
        return dir;
    }
    getFilePath(type, filename) {
        return path_1.default.join(this.getDirectory(type), filename);
    }
    fileExists(filePath) {
        return fs_1.default.existsSync(filePath);
    }
    deleteFile(filePath) {
        try {
            if (fs_1.default.existsSync(filePath)) {
                fs_1.default.unlinkSync(filePath);
                return true;
            }
        }
        catch (e) {
            console.error(`Failed to delete file at ${filePath}`, e);
        }
        return false;
    }
    getStorageStats() {
        let totalFiles = 0;
        let totalSizeBytes = 0;
        const countDir = (dir) => {
            if (!fs_1.default.existsSync(dir))
                return;
            const files = fs_1.default.readdirSync(dir);
            for (const f of files) {
                const full = path_1.default.join(dir, f);
                try {
                    const stat = fs_1.default.statSync(full);
                    if (stat.isDirectory()) {
                        countDir(full);
                    }
                    else {
                        totalFiles++;
                        totalSizeBytes += stat.size;
                    }
                }
                catch { }
            }
        };
        countDir(this.baseDir);
        return {
            totalFiles,
            totalSizeBytes,
            freeSpaceMB: 50000, // Safe estimate
        };
    }
}
exports.StorageService = StorageService;
exports.storageService = new StorageService();
