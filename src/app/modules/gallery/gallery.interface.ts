
import { Model } from 'mongoose';

export interface IGallery {
  image: string;
  category: string;
}

export type IGalleryModules = Model<IGallery, Record<string, unknown>>;