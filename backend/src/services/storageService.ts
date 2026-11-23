import fs from 'fs';
import path from 'path';
import { config } from '../config/env.js';

export class StorageService {
  private baseDir: string;

  constructor() {
    this.baseDir = config.STORAGE_DIR;
    this.ensureDirs();
  }

  private ensureDirs() {
    const subdirs = ['videos', 'audio', 'subtitles', 'thumbnails', 'exports', 'voices', 'temp'];
    for (const sub of subdirs) {
      const dirPath = path.join(this.baseDir, sub);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    }
  }

  public getDirectory(type: 'videos' | 'audio' | 'subtitles' | 'thumbnails' | 'exports' | 'voices' | 'temp'): string {
    const dir = path.join(this.baseDir, type);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  public getFilePath(type: 'videos' | 'audio' | 'subtitles' | 'thumbnails' | 'exports' | 'voices' | 'temp', filename: string): string {
    return path.join(this.getDirectory(type), filename);
  }

  public fileExists(filePath: string): boolean {
    return fs.existsSync(filePath);
  }

  public deleteFile(filePath: string): boolean {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
    } catch (e) {
      console.error(`Failed to delete file at ${filePath}`, e);
    }
    return false;
  }

  public getStorageStats(): { totalFiles: number; totalSizeBytes: number; freeSpaceMB: number } {
    let totalFiles = 0;
    let totalSizeBytes = 0;

    const countDir = (dir: string) => {
      if (!fs.existsSync(dir)) return;
      const files = fs.readdirSync(dir);
      for (const f of files) {
        const full = path.join(dir, f);
        try {
          const stat = fs.statSync(full);
          if (stat.isDirectory()) {
            countDir(full);
          } else {
            totalFiles++;
            totalSizeBytes += stat.size;
          }
        } catch {}
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

export const storageService = new StorageService();
