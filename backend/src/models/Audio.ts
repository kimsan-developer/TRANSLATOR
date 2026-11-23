import mongoose, { Document, Schema } from 'mongoose';

export interface IAudio extends Document {
  projectId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  type: 'extracted' | 'tts' | 'cloned' | 'bg_music' | 'mixed';
  filename: string;
  path: string;
  duration: number;
  language?: string;
  voiceId?: string;
  volume: number;
  status: 'ready' | 'processing' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

const AudioSchema = new Schema<IAudio>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['extracted', 'tts', 'cloned', 'bg_music', 'mixed'],
      required: true,
    },
    filename: { type: String, required: true },
    path: { type: String, required: true },
    duration: { type: Number, default: 0 },
    language: { type: String },
    voiceId: { type: String },
    volume: { type: Number, default: 1.0 },
    status: { type: String, enum: ['ready', 'processing', 'failed'], default: 'ready' },
  },
  { timestamps: true }
);

export const Audio = mongoose.model<IAudio>('Audio', AudioSchema);
