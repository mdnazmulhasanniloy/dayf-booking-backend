import { model, Schema, Types } from 'mongoose';
import {
  IReviews,
  IReviewsModules,
  REVIEW_MODEL_TYPE,
} from './reviews.interface';

const reviewsSchema = new Schema<IReviews>(
  {
    user: {
      type: Types.ObjectId,
      ref: 'User',
      required: true,
    },
    modelType: {
      type: String,
      enum: Object.values(REVIEW_MODEL_TYPE),
      required: true,
    },
    reference: {
      type: Types.ObjectId,
      refPath: 'modelType',
      required: true,
    },
    review: {
      type: String,
      required: true,
      trim: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
  },
  {
    timestamps: true,
  },
);

const Reviews = model<IReviews, IReviewsModules>('Reviews', reviewsSchema);
export default Reviews;
