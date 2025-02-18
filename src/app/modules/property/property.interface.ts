import { Model, ObjectId } from 'mongoose';

export interface IImage {
  key: string;
  url: string;
}

export interface ILocations {
  type: string;
  coordinates: [number, number];
}

export interface IProperty {
  deleteKey?: string[];
  author: ObjectId;
  images: IImage[];
  name: string;
  length: number;
  description: string;
  address: string;
  location: ILocations;
  facility: ObjectId[];
  Other: string[];
  avgRating: number;
  ratings: ObjectId[];
  rooms: ObjectId[];
  isDeleted: boolean;
}

export type IPropertyModules = Model<IProperty, Record<string, unknown>>;
