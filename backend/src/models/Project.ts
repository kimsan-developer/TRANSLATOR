import mongoose, { Document, Schema } from 'mongoose';

export interface IProject extends Document {
  title: string;
  description?: string;
  userId: mongoose.Types.ObjectId;
  sourceLanguage: string;
  targetLanguage: string;
  status: 'draft' | 'uploaded' | 'transcribing' | 'translated' | 'dubbed' | 'completed' | 'failed';
  videoFile?: string;
  videoDuration?: number;
  thumbnail?: string;
  originalSubtitleId?: mongoose.Types.ObjectId;
  translatedSubtitleId?: mongoose.Types.ObjectId;
  generatedAudioFile?: string;
  exportedVideoFile?: string;
  currentStep: number;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProject>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sourceLanguage: { type: String, default: 'auto' },
    targetLanguage: { type: String, default: 'en' },
    status: {
      type: String,
      enum: ['draft', 'uploaded', 'transcribing', 'translated', 'dubbed', 'completed', 'failed'],
      default: 'draft',
      index: true,
    },
    videoFile: { type: String },
    videoDuration: { type: Number, default: 0 },
    thumbnail: { type: String },
    originalSubtitleId: { type: Schema.Types.ObjectId, ref: 'Subtitle' },
    translatedSubtitleId: { type: Schema.Types.ObjectId, ref: 'Subtitle' },
    generatedAudioFile: { type: String },
    exportedVideoFile: { type: String },
    currentStep: { type: Number, default: 1 },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export const Project = mongoose.model<IProject>('Project', ProjectSchema);
