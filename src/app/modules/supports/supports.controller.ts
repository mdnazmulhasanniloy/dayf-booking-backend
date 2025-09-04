import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import { supportsService } from './supports.service';
import sendResponse from '../../utils/sendResponse';

const createSupports = catchAsync(async (req: Request, res: Response) => {
  const result = await supportsService.createSupports(req.body, req.files);
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Supports message send successfully',
    data: result,
  });
});

const getAllSupports = catchAsync(async (req: Request, res: Response) => {
  const result = await supportsService.getAllSupports(req.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'All supports fetched successfully',
    data: result,
  });
});

const getSupportsById = catchAsync(async (req: Request, res: Response) => {
  const result = await supportsService.getSupportsById(req.params.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Supports fetched successfully',
    data: result,
  });
});

const deleteSupports = catchAsync(async (req: Request, res: Response) => {
  const result = await supportsService.deleteSupports(req.params.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Supports deleted successfully',
    data: result,
  });
});

export const supportsController = {
  createSupports,
  getAllSupports,
  getSupportsById,
  deleteSupports,
};
