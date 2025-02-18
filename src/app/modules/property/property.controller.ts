import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import { propertyService } from './property.service';
import sendResponse from '../../utils/sendResponse'; 

const createProperty = catchAsync(async (req: Request, res: Response) => {
  req.body['author'] = req?.user?.userId;
  const result = await propertyService.createProperty(req.body, req.files);
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Property created successfully',
    data: result,
  });
});

const getAllProperty = catchAsync(async (req: Request, res: Response) => {
  const result = await propertyService.getAllProperty(req?.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'All property fetched successfully',
    data: result,
  });
});

const getMyProperty = catchAsync(async (req: Request, res: Response) => {
  req.query['author'] = req?.user?.userId;
  const result = await propertyService.getAllProperty(req?.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'My property fetched successfully',
    data: result,
  });
});

const getPropertyById = catchAsync(async (req: Request, res: Response) => {
  const result = await propertyService.getPropertyById(req.params.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Property fetched successfully',
    data: result,
  });
});

const updateProperty = catchAsync(async (req: Request, res: Response) => {
  const result = await propertyService.updateProperty(
    req.params.id,
    req.body,
    req.files,
  );
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Property updated successfully',
    data: result,
  });
});

const deleteProperty = catchAsync(async (req: Request, res: Response) => {
  const result = await propertyService.deleteProperty(req.params.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Property deleted successfully',
    data: result,
  });
});

export const propertyController = {
  createProperty,
  getAllProperty,
  getPropertyById,
  updateProperty,
  deleteProperty,
  getMyProperty,
};
