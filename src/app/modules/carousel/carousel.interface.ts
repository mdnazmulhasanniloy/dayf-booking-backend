import { Model } from 'mongoose';

export interface ICarousel {
  image: string;
  title: string;
  description: string;
}

export type ICarouselModules = Model<ICarousel, Record<string, unknown>>;
