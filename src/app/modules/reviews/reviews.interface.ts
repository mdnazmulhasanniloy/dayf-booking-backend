import { Model, ObjectId } from 'mongoose';

export enum REVIEW_MODEL_TYPE {
  apartment = 'Apartment',
  property = 'Property',
}

export interface IReviews {
  _id?: string;
  user: ObjectId;
  modelType: string;
  reference: ObjectId;
  review: string;
  rating: number;
  booking?: ObjectId;
}

export type IReviewsModules = Model<IReviews, Record<string, unknown>>;
