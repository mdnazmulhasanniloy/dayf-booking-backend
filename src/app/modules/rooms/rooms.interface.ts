import { Model, ObjectId } from 'mongoose';
import { IFacilities } from '../facilities/facilities.interface';
import { IImage, IProperty } from '../property/property.interface';
import { IUser } from '../user/user.interface';

export interface IRooms {
  deleteKey?: string[];
  property: ObjectId | IProperty;
  author: ObjectId | IUser;
  roomType: string;
  pricePerNight: number;
  guestsAllowed: number;
  availableRooms: number;
  roomSpace: Number;
  bedDetails: string;
  facilities: ObjectId[] | IFacilities[];
  otherFacilities: string[];
  customerChoices: string;
  descriptions: string;
  shortDescriptions: string;   
  policy: string;
  isDeleted: boolean;
  images: IImage[];
}

export type IRoomsModules = Model<IRooms, Record<string, unknown>>;
