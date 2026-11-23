import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  role: 'superadmin' | 'admin' | 'user';
  avatar?: string;
  isActive: boolean;
  preferences?: {
    theme?: string;
    defaultSourceLang?: string;
    defaultTargetLang?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['superadmin', 'admin', 'user'], default: 'user' },
    avatar: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    preferences: {
      theme: { type: String, default: 'dark' },
      defaultSourceLang: { type: String, default: 'auto' },
      defaultTargetLang: { type: String, default: 'en' },
    },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>('User', UserSchema);
