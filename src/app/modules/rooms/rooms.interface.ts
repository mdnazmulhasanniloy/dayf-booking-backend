import { Model, ObjectId } from 'mongoose';
import { IFacilities } from '../facilities/facilities.interface';
import { IImage, IProperty } from '../property/property.interface';
import { IUser } from '../user/user.interface';
import { IRoomTypes } from '../roomTypes/roomTypes.interface';

export interface IRooms {
  roomNumber: string;
  property: ObjectId | IProperty;
  roomCategory: ObjectId | IRoomTypes;
  isActive: boolean;
  isDeleted: boolean;
}

export type IRoomsModules = Model<IRooms, Record<string, unknown>>;
