import { Schema, Types, model } from 'mongoose';
import { IMessages, IMessagesModel } from './messages.interface';

const messageSchema = new Schema<IMessages>(
  {
    text: {
      type: String,
      default: null,
    },
    imageUrl: [
      {
        key: {
          type: String,
          default: null,
        },
        url: { type: String, default: null },
      },
    ],
    seen: {
      type: Boolean,
      default: false,
    },
    sender: {
      type: Types.ObjectId,
      required: true,
      ref: 'User',
    },
    receiver: {
      type: Types.ObjectId,
      required: true,
      ref: 'User',
    },

    chat: {
      type: Types.ObjectId,
      required: true,
      ref: 'Chat',
    },
  },
  {
    timestamps: true,
  },
);

const Message = model<IMessages, IMessagesModel>('Messages', messageSchema);

export default Message;
