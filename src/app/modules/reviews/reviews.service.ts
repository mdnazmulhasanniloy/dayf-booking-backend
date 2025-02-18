import httpStatus from 'http-status';
import { IReviews, REVIEW_MODEL_TYPE } from './reviews.interface';
import Reviews from './reviews.models';
import QueryBuilder from '../../builder/QueryBuilder';
import AppError from '../../error/AppError';
import { getAverageRating } from './reviews.utils';
import Apartment from '../apartment/apartment.models';
import Property from '../property/property.models';
import { ClientSession, startSession } from 'mongoose';

 
const createReviews = async (payload: IReviews) => {
  const session: ClientSession = await startSession();
  session.startTransaction();

  try {
    // Create the review
    const result: IReviews[] = await Reviews.create([payload], { session });
    if (!result || result.length === 0) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Failed to create review');
    }

    // Calculate the new average rating
    const { averageRating, totalReviews } = await getAverageRating(
      result[0]?.reference?.toString(),
    );

    const newAvgRating =
      (Number(averageRating) * Number(totalReviews) + Number(payload.rating)) /
      (totalReviews + 1);

    switch (payload.modelType) {
      case REVIEW_MODEL_TYPE.apartment: {
        await Apartment.findByIdAndUpdate(
          result[0].reference,
          {
            avgRating: newAvgRating,
            $addToSet: { reviews: result[0]?._id },
          },
          { session },
        );
        break;
      }
      case REVIEW_MODEL_TYPE.property: {
        await Property.findByIdAndUpdate(
          result[0]?.reference,
          {
            avgRating: newAvgRating,
            $addToSet: { reviews: result[0]?._id },
          },
          { session },
        );
        break;
      }
      default:
        throw new AppError(httpStatus.BAD_REQUEST, 'Invalid model type');
    }

    await session.commitTransaction();
    session.endSession();

    return result[0];
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    throw new AppError(
      httpStatus.BAD_REQUEST,
      error?.message || 'Review creation failed',
    );
  }
};

const getAllReviews = async (query: Record<string, any>) => {
  const reviewsModel = new QueryBuilder(Reviews.find(), query)
    .search([''])
    .filter()
    .paginate()
    .sort()
    .fields();

  const data = await reviewsModel.modelQuery;
  const meta = await reviewsModel.countTotal();

  return {
    data,
    meta,
  };
};

const getReviewsById = async (id: string) => {
  const result = await Reviews.findById(id);
  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Reviews not found!');
  }
  return result;
};

const updateReviews = async (id: string, payload: Partial<IReviews>) => {
  const result = await Reviews.findByIdAndUpdate(id, payload, { new: true });
  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to update Reviews');
  }
  return result;
};

const deleteReviews = async (id: string) => {
  const session: ClientSession = await startSession();
  session.startTransaction();

  try {
    const result = await Reviews.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true, session },
    );
    if (!result) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Failed to delete review');
    }

    // Pull the review from the corresponding model (Apartment/Property)
    switch (result.modelType) {
      case REVIEW_MODEL_TYPE.apartment: {
        await Apartment.findByIdAndUpdate(
          result.reference,
          { $pull: { reviews: result?._id } },
          { session },
        );
        break;
      }
      case REVIEW_MODEL_TYPE.property: {
        await Property.findByIdAndUpdate(
          result?.reference,
          { $pull: { reviews: result?._id } },
          { session },
        );
        break;
      }
      default:
        throw new AppError(httpStatus.BAD_REQUEST, 'Invalid model type');
    }

    // Commit the transaction if everything is successful
    await session.commitTransaction();
    session.endSession();

    return result;
  } catch (error: any) {
    // Rollback the transaction if something goes wrong
    await session.abortTransaction();
    session.endSession();
    throw new AppError(
      httpStatus.BAD_REQUEST,
      error?.message || 'Review deletion failed',
    );
  }
};

export const reviewsService = {
  createReviews,
  getAllReviews,
  getReviewsById,
  updateReviews,
  deleteReviews,
};
