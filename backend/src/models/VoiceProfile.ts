import mongoose, { Document, Schema } from 'mongoose';

export interface IVoiceProfile extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  language: string;
  gender: 'male' | 'female' | 'neutral';
  samplePath: string;
  sampleDuration: number;
  provider: 'elevenlabs' | 'edge-tts' | 'local' | 'openai';
  voiceId?: string;
  consentAgreed: boolean;
  status: 'ready' | 'processing' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

const VoiceProfileSchema = new Schema<IVoiceProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    language: { type: String, default: 'en' },
    gender: { type: String, enum: ['male', 'female', 'neutral'], default: 'neutral' },
    samplePath: { type: String, required: true },
    sampleDuration: { type: Number, default: 0 },
    provider: { type: String, enum: ['elevenlabs', 'edge-tts', 'local', 'openai'], default: 'local' },
    voiceId: { type: String },
    consentAgreed: { type: Boolean, required: true, default: false },
    status: { type: String, enum: ['ready', 'processing', 'failed'], default: 'ready' },
  },
  { timestamps: true }
);

export const VoiceProfile = mongoose.model<IVoiceProfile>('VoiceProfile', VoiceProfileSchema);
