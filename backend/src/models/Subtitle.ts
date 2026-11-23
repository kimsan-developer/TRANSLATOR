import mongoose, { Document, Schema } from 'mongoose';

export interface ISubtitleSegment {
  id: number;
  start: number; // in seconds
  end: number;   // in seconds
  text: string;
  originalText?: string;
  confidence?: number;
}

export interface ISubtitle extends Document {
  projectId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  language: string;
  type: 'original' | 'translated';
  format: 'srt' | 'vtt';
  segments: ISubtitleSegment[];
  createdAt: Date;
  updatedAt: Date;
}

const SubtitleSegmentSchema = new Schema<ISubtitleSegment>(
  {
    id: { type: Number, required: true },
    start: { type: Number, required: true },
    end: { type: Number, required: true },
    text: { type: String, required: true },
    originalText: { type: String },
    confidence: { type: Number, default: 1.0 },
  },
  { _id: false }
);

const SubtitleSchema = new Schema<ISubtitle>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    language: { type: String, required: true },
    type: { type: String, enum: ['original', 'translated'], required: true },
    format: { type: String, enum: ['srt', 'vtt'], default: 'srt' },
    segments: [SubtitleSegmentSchema],
  },
  { timestamps: true }
);

export const Subtitle = mongoose.model<ISubtitle>('Subtitle', SubtitleSchema);
