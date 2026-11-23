import mongoose, { Document, Schema } from 'mongoose';

export interface ITranslation extends Document {
  projectId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  sourceLanguage: string;
  targetLanguage: string;
  provider: 'openai' | 'gemini' | 'local';
  style: 'formal' | 'casual';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  translatedSegments: {
    segmentId: number;
    start: number;
    end: number;
    sourceText: string;
    translatedText: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const TranslationSchema = new Schema<ITranslation>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sourceLanguage: { type: String, required: true },
    targetLanguage: { type: String, required: true },
    provider: { type: String, enum: ['openai', 'gemini', 'local'], default: 'gemini' },
    style: { type: String, enum: ['formal', 'casual'], default: 'formal' },
    status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
    translatedSegments: [
      {
        segmentId: { type: Number, required: true },
        start: { type: Number, required: true },
        end: { type: Number, required: true },
        sourceText: { type: String, required: true },
        translatedText: { type: String, required: true },
      },
    ],
  },
  { timestamps: true }
);

export const Translation = mongoose.model<ITranslation>('Translation', TranslationSchema);
