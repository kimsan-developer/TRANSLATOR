import mongoose, { Document, Schema } from 'mongoose';

export interface IUsageRecord extends Document {
  userId: mongoose.Types.ObjectId;
  projectId?: mongoose.Types.ObjectId;
  feature: 'transcription' | 'translation' | 'tts' | 'voice_cloning' | 'export';
  provider: string;
  durationSeconds?: number;
  characterCount?: number;
  costEstimate: number;
  status: 'success' | 'failed';
  timestamp: Date;
}

const UsageRecordSchema = new Schema<IUsageRecord>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project' },
    feature: {
      type: String,
      enum: ['transcription', 'translation', 'tts', 'voice_cloning', 'export'],
      required: true,
      index: true,
    },
    provider: { type: String, required: true },
    durationSeconds: { type: Number, default: 0 },
    characterCount: { type: Number, default: 0 },
    costEstimate: { type: Number, default: 0 },
    status: { type: String, enum: ['success', 'failed'], default: 'success' },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

export const UsageRecord = mongoose.model<IUsageRecord>('UsageRecord', UsageRecordSchema);
