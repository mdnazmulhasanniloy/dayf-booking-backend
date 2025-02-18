import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import { roomsService } from './rooms.service';
import sendResponse from '../../utils/sendResponse';
import { storeFile } from '../../utils/fileHelper';
import { uploadToS3 } from '../../utils/s3';

const createRooms = catchAsync(async (req: Request, res: Response) => {
  req.body.author = req.user.userId;
  const result = await roomsService.createRooms(req.body, req.files);
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Rooms created successfully',
    data: result,
  });
});

const getAllRooms = catchAsync(async (req: Request, res: Response) => {
  const result = await roomsService.getAllRooms(req.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'All rooms fetched successfully',
    data: result,
  });
});
// const getRoomsByPropertyId = catchAsync(async (req: Request, res: Response) => {
//   const result = await roomsService.getAllRooms(req.query);
//   sendResponse(res, {
//     statusCode: 200,
//     success: true,
//     message: 'All rooms fetched successfully',
//     data: result,
//   });
// });

const getRoomsById = catchAsync(async (req: Request, res: Response) => {
  const result = await roomsService.getRoomsById(req.params.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Rooms fetched successfully',
    data: result,
  });
});
const updateRooms = catchAsync(async (req: Request, res: Response) => {
  const result = await roomsService.updateRooms(
    req.params.id,
    req.body,
    req.files,
  );
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Rooms updated successfully',
    data: result,
  });
});

const deleteRooms = catchAsync(async (req: Request, res: Response) => {
  const result = await roomsService.deleteRooms(req.params.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Rooms deleted successfully',
    data: result,
  });
});

export const roomsController = {
  createRooms,
  getAllRooms,
  getRoomsById,
  updateRooms,
  deleteRooms,
};
