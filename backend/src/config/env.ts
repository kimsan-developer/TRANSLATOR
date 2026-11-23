import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/videotranslator',
  JWT_SECRET: process.env.JWT_SECRET || 'video_translator_ai_pro_jwt_secret_key_2026',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'video_translator_ai_pro_jwt_refresh_secret_key_2026',
  JWT_EXPIRES_IN: '1d',
  JWT_REFRESH_EXPIRES_IN: '7d',
  STORAGE_DIR: path.resolve(process.env.STORAGE_DIR || path.join(__dirname, '../../uploads')),
  MAX_FILE_SIZE_MB: process.env.MAX_FILE_SIZE_MB ? parseInt(process.env.MAX_FILE_SIZE_MB, 10) : 2048, // 2GB
  PYTHON_PATH: process.env.PYTHON_PATH || 'python',
  TRANSCRIPTION_SERVICE_URL: process.env.TRANSCRIPTION_SERVICE_URL || 'http://127.0.0.1:5050',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef', // 32 chars
};
