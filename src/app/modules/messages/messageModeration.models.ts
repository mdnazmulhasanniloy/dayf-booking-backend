import { model, Schema, Types } from 'mongoose';

interface IMessageModerationLog {
  sender?: Types.ObjectId;
  receiver?: Types.ObjectId;
  channel: 'rest' | 'socket';
  matchedType: string;
  textPreview: string;
}

const messageModerationLogSchema = new Schema<IMessageModerationLog>(
  {
    sender: { type: Schema.Types.ObjectId, ref: 'User' },
    receiver: { type: Schema.Types.ObjectId, ref: 'User' },
    channel: { type: String, enum: ['rest', 'socket'], required: true },
    matchedType: { type: String, required: true },
    textPreview: { type: String, required: true, maxlength: 120 },
  },
  { timestamps: true },
);

messageModerationLogSchema.index({ sender: 1, createdAt: -1 });

const MessageModerationLog = model<IMessageModerationLog>(
  'MessageModerationLog',
  messageModerationLogSchema,
);

export default MessageModerationLog;

