import mongoose, { Document, Schema } from 'mongoose';

export interface IExportJob extends Document {
  projectId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  format: 'mp4' | 'mkv' | 'mov' | 'webm';
  resolution: '720p' | '1080p' | '4k' | 'original';
  burnSubtitles: boolean;
  replaceAudio: boolean;
  mixBgMusic: boolean;
  originalAudioVolume: number;
  dubbedAudioVolume: number;
  bgMusicVolume: number;
  outputPath?: string;
  filename?: string;
  fileSizeBytes?: number;
  progress: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ExportJobSchema = new Schema<IExportJob>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    format: { type: String, enum: ['mp4', 'mkv', 'mov', 'webm'], default: 'mp4' },
    resolution: { type: String, enum: ['720p', '1080p', '4k', 'original'], default: '1080p' },
    burnSubtitles: { type: Boolean, default: true },
    replaceAudio: { type: Boolean, default: true },
    mixBgMusic: { type: Boolean, default: false },
    originalAudioVolume: { type: Number, default: 0.1 },
    dubbedAudioVolume: { type: Number, default: 1.0 },
    bgMusicVolume: { type: Number, default: 0.15 },
    outputPath: { type: String },
    filename: { type: String },
    fileSizeBytes: { type: Number, default: 0 },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
      default: 'pending',
    },
    error: { type: String },
  },
  { timestamps: true }
);

export const ExportJob = mongoose.model<IExportJob>('ExportJob', ExportJobSchema);
