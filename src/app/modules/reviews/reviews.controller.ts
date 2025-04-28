import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import { reviewsService } from './reviews.service';
import sendResponse from '../../utils/sendResponse';
import { storeFile } from '../../utils/fileHelper';
import { uploadToS3 } from '../../utils/s3';

const createReviews = catchAsync(async (req: Request, res: Response) => {
  req.body.user = req?.user?.userId;
  const result = await reviewsService.createReviews(req.body);
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Reviews created successfully',
    data: result,
  });
});

const getAllReviews = catchAsync(async (req: Request, res: Response) => {
  const result = await reviewsService.getAllReviews(req.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'All reviews fetched successfully',
    data: result,
  });
});

const getReviewsById = catchAsync(async (req: Request, res: Response) => {
  const result = await reviewsService.getReviewsById(req.params.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Reviews fetched successfully',
    data: result,
  });
});
const updateReviews = catchAsync(async (req: Request, res: Response) => {
  const result = await reviewsService.updateReviews(req.params.id, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Reviews updated successfully',
    data: result,
  });
});

const deleteReviews = catchAsync(async (req: Request, res: Response) => {
  const result = await reviewsService.deleteReviews(req.params.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Reviews deleted successfully',
    data: result,
  });
});

export const reviewsController = {
  createReviews,
  getAllReviews,
  getReviewsById,
  updateReviews,
  deleteReviews,
};
