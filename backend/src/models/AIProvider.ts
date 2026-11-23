import mongoose, { Document, Schema } from 'mongoose';

export interface IAIProvider extends Document {
  name: string;
  type: 'openai' | 'gemini' | 'whisper' | 'edge-tts' | 'elevenlabs' | 'local';
  apiKeyEncrypted?: string;
  endpoint?: string;
  models: string[];
  selectedModel?: string;
  enabled: boolean;
  isDefault: boolean;
  status: 'online' | 'offline' | 'error' | 'unconfigured';
  lastTestedAt?: Date;
  usageCount: number;
  config?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const AIProviderSchema = new Schema<IAIProvider>(
  {
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ['openai', 'gemini', 'whisper', 'edge-tts', 'elevenlabs', 'local'],
      required: true,
      unique: true,
    },
    apiKeyEncrypted: { type: String },
    endpoint: { type: String },
    models: [{ type: String }],
    selectedModel: { type: String },
    enabled: { type: Boolean, default: true },
    isDefault: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['online', 'offline', 'error', 'unconfigured'],
      default: 'unconfigured',
    },
    lastTestedAt: { type: Date },
    usageCount: { type: Number, default: 0 },
    config: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export const AIProvider = mongoose.model<IAIProvider>('AIProvider', AIProviderSchema);
