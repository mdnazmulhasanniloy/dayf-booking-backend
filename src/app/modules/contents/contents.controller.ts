import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import { contentsService } from './contents.service';
import sendResponse from '../../utils/sendResponse';

 

// Get all contents
const getAllContents = catchAsync(async (req: Request, res: Response) => {
  const result = await contentsService.getAllContents(req.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Contents retrieved successfully',
    data: result,
  });
});

// Get contents by ID
const getContentsById = catchAsync(async (req: Request, res: Response) => {
  const result = await contentsService.getContentsById(req.params.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Content retrieved successfully',
    data: result,
  });
});
// Get contents by ID
const supportMessage = catchAsync(async (req: Request, res: Response) => {
  const result = await contentsService.supportMessage(req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Message send successfully',
    data: result,
  });
});

// Update contents
const updateContents = catchAsync(async (req: Request, res: Response) => {
  const result = await contentsService.updateContents(req.body, req.files);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Content updated successfully',
    data: result,
  });
});

// Delete contents
const deleteContents = catchAsync(async (req: Request, res: Response) => {
  const result = await contentsService.deleteContents(req.params.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Content deleted successfully',
    data: result,
  });
});
const deleteBanner = catchAsync(async (req: Request, res: Response) => {
  const result = await contentsService.deleteBanner(req.params.key);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Content image deleted successfully',
    data: result,
  });
});

export const contentsController = { 
  getAllContents,
  getContentsById,
  updateContents,
  deleteContents,
  deleteBanner,
  supportMessage,
};
