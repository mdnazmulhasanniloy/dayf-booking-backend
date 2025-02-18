import { Model, ObjectId } from 'mongoose';
import { IImage, ILocations } from '../property/property.interface';
import { IFacilities } from '../facilities/facilities.interface';

export interface IApartment {
  deleteKey: string[];
  id: string;
  profile: string;
  coverImage: string;
  author: ObjectId;
  price: number;
  images: IImage[];
  name: string;
  roomSize: number;
  availability: number;
  shortDescription: string;
  description: string;
  location: ILocations;
  facilities: IFacilities;
  othersFacilities: string[];
  policy: string;
  isDeleted: boolean;
}

export type IApartmentModules = Model<IApartment, Record<string, unknown>>;
