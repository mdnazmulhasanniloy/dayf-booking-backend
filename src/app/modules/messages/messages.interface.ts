import { Model, ObjectId } from 'mongoose';

export interface IMessages {
  _id?: ObjectId;
  id?: string;
  text?: string; 
  imageUrl?: {
    key: string;
    url: string;
  }[];

  seen: boolean;
  chat: ObjectId;
  sender: ObjectId;
  receiver: ObjectId;
}

export type IMessagesModel = Model<IMessages, Record<string, unknown>>;
