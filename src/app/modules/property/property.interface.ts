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
  id: string;
  deleteKey?: string[];
  author: ObjectId;
  images: IImage[];
  name: string;
  length: number;
  description: string;
  address: string;
  location: ILocations;
  facility: ObjectId[];
  coverImage: string;
  descriptions: string;
  shortDescriptions: string;
  policy: string;
  Other: string[];
  avgRating: number;
  reviews: ObjectId[];
  rooms: ObjectId[];
  isDeleted: boolean;
}

export type IPropertyModules = Model<IProperty, Record<string, unknown>>;
