
import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';  
import { facilitiesService } from './facilities.service';
import sendResponse from '../../utils/sendResponse';
import { storeFile } from '../../utils/fileHelper';
import { uploadToS3 } from '../../utils/s3';

const createFacilities = catchAsync(async (req: Request, res: Response) => {
 const result = await facilitiesService.createFacilities(req.body, req.file);
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Facilities created successfully',
    data: result,
  });

});

const getAllFacilities = catchAsync(async (req: Request, res: Response) => {

 const result = await facilitiesService.getAllFacilities(req.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'All facilities fetched successfully',
    data: result,
  });

});

const getFacilitiesById = catchAsync(async (req: Request, res: Response) => {
 const result = await facilitiesService.getFacilitiesById(req.params.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Facilities fetched successfully',
    data: result,
  });

});

const updateFacilities = catchAsync(async (req: Request, res: Response) => {
const result = await facilitiesService.updateFacilities(req.params.id, req.body, req.file);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Facilities updated successfully',
    data: result,
  });

});


const deleteFacilities = catchAsync(async (req: Request, res: Response) => {
 const result = await facilitiesService.deleteFacilities(req.params.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Facilities deleted successfully',
    data: result,
  });

});

export const facilitiesController = {
  createFacilities,
  getAllFacilities,
  getFacilitiesById,
  updateFacilities,
  deleteFacilities,
};