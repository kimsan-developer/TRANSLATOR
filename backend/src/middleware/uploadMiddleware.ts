import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { storageService } from '../services/storageService.js';
import { config } from '../config/env.js';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'video') {
      cb(null, storageService.getDirectory('videos'));
    } else if (file.fieldname === 'audio' || file.fieldname === 'bgMusic') {
      cb(null, storageService.getDirectory('audio'));
    } else if (file.fieldname === 'voiceSample') {
      cb(null, storageService.getDirectory('voices'));
    } else if (file.fieldname === 'subtitle') {
      cb(null, storageService.getDirectory('subtitles'));
    } else {
      cb(null, storageService.getDirectory('temp'));
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  },
});

export const uploadMedia = multer({
  storage,
  limits: {
    fileSize: config.MAX_FILE_SIZE_MB * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedVideoExts = ['.mp4', '.mkv', '.mov', '.avi', '.webm', '.m4v'];
    const allowedAudioExts = ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac'];
    const allowedSubExts = ['.srt', '.vtt'];

    const ext = path.extname(file.originalname).toLowerCase();

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
