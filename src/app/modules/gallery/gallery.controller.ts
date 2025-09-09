import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import { galleryService } from './gallery.service';
import sendResponse from '../../utils/sendResponse';
import { uploadToS3 } from '../../utils/s3';

const createGallery = catchAsync(async (req: Request, res: Response) => {
  if (req?.file) {
    req.body.image = await uploadToS3({
      file: req.file,
      fileName: `images/gallery/${Math.floor(100000 + Math.random() * 900000)}`,
    });
  }
  const result = await galleryService.createGallery(req.body);
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Gallery created successfully',
    data: result,
  });
});

const getAllGallery = catchAsync(async (req: Request, res: Response) => {
  const result = await galleryService.getAllGallery(req.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'All gallery fetched successfully',
    data: result,
  });
});

const getGalleryById = catchAsync(async (req: Request, res: Response) => {
  const result = await galleryService.getGalleryById(req.params.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Gallery fetched successfully',
    data: result,
  });
});

const updateGallery = catchAsync(async (req: Request, res: Response) => {
  if (req?.file) {
    req.body.image = await uploadToS3({
      file: req.file,
      fileName: `images/gallery/${Math.floor(100000 + Math.random() * 900000)}`,
    });
  }
  const result = await galleryService.updateGallery(req.params.id, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Gallery updated successfully',
    data: result,
  });
});

const deleteGallery = catchAsync(async (req: Request, res: Response) => {
  const result = await galleryService.deleteGallery(req.params.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Gallery deleted successfully',
    data: result,
  });
});

export const galleryController = {
  createGallery,
  getAllGallery,
  getGalleryById,
  updateGallery,
  deleteGallery,
};
