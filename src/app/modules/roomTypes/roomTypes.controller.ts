import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import { roomTypesService } from './roomTypes.service';
import sendResponse from '../../utils/sendResponse';

const createRoomTypes = catchAsync(async (req: Request, res: Response) => {
  req.body.author = req.user.userId;
  const result = await roomTypesService.createRoomTypes(req.body, req.files);
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Rooms Type created successfully',
    data: result,
  });
});

const getAllRoomTypes = catchAsync(async (req: Request, res: Response) => {
  const result = await roomTypesService.getAllRoomTypes(req.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'All rooms types fetched successfully',
    data: result,
  });
});
const globalSearch = catchAsync(async (req: Request, res: Response) => {
  const result = await roomTypesService.globalSearch(req.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'All search data fetched successfully',
    data: result,
  });
});

const getRoomTypesById = catchAsync(async (req: Request, res: Response) => {
  const result = await roomTypesService.getRoomTypesById(req.params.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Room type fetched successfully',
    data: result,
  });
});
const updateRoomTypes = catchAsync(async (req: Request, res: Response) => {
  const result = await roomTypesService.updateRoomTypes(
    req.params.id,
    req.body,
    req.files,
  );
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Room types updated successfully',
    data: result,
  });
});

const deleteRoomTypes = catchAsync(async (req: Request, res: Response) => {
  const result = await roomTypesService.deleteRoomTypes(req.params.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Room types deleted successfully',
    data: result,
  });
});

export const roomTypesController = {
  createRoomTypes,
  getAllRoomTypes,
  getRoomTypesById,
  updateRoomTypes,
  deleteRoomTypes,
  globalSearch,
};
