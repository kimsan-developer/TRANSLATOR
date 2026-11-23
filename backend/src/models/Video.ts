import mongoose, { Document, Schema } from 'mongoose';

export interface IVideo extends Document {
  projectId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  originalName: string;
  filename: string;
  path: string;
  size: number;
  duration: number;
  resolution: {
    width: number;
    height: number;
  };
  format: string;
  fps: number;
  bitrate?: number;
  thumbnailPath?: string;
  audioTrackPath?: string;
  createdAt: Date;
  updatedAt: Date;
}

const VideoSchema = new Schema<IVideo>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    originalName: { type: String, required: true },
    filename: { type: String, required: true },
    path: { type: String, required: true },
    size: { type: Number, required: true },
    duration: { type: Number, default: 0 },
    resolution: {
      width: { type: Number, default: 0 },
      height: { type: Number, default: 0 },
    },
    format: { type: String, default: 'mp4' },
    fps: { type: Number, default: 30 },
    bitrate: { type: Number, default: 0 },
    thumbnailPath: { type: String },
    audioTrackPath: { type: String },
  },
  { timestamps: true }
);

export const Video = mongoose.model<IVideo>('Video', VideoSchema);
