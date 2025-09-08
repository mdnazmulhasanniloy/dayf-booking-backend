import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import { carouselService } from './carousel.service';
import sendResponse from '../../utils/sendResponse'; 
import { uploadToS3 } from '../../utils/s3';

const createCarousel = catchAsync(async (req: Request, res: Response) => {
  if (req?.file) {
    req.body.image = await uploadToS3({
      file: req.file,
      fileName: `images/carousel/${Math.floor(100000 + Math.random() * 900000)}`,
    });
  }
  const result = await carouselService.createCarousel(req.body);
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Carousel created successfully',
    data: result,
  });
});

const getAllCarousel = catchAsync(async (req: Request, res: Response) => {
  const result = await carouselService.getAllCarousel(req.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'All carousel fetched successfully',
    data: result,
  });
});

const getCarouselById = catchAsync(async (req: Request, res: Response) => {
  if (req?.file) {
    req.body.image = await uploadToS3({
      file: req.file,
      fileName: `images/carousel/${Math.floor(100000 + Math.random() * 900000)}`,
    });
  }
  const result = await carouselService.getCarouselById(req.params.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Carousel fetched successfully',
    data: result,
  });
});
const updateCarousel = catchAsync(async (req: Request, res: Response) => {
  const result = await carouselService.updateCarousel(req.params.id, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Carousel updated successfully',
    data: result,
  });
});

const deleteCarousel = catchAsync(async (req: Request, res: Response) => {
  const result = await carouselService.deleteCarousel(req.params.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Carousel deleted successfully',
    data: result,
  });
});

export const carouselController = {
  createCarousel,
  getAllCarousel,
  getCarouselById,
  updateCarousel,
  deleteCarousel,
};
