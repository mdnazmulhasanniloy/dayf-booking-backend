import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import { calenderService } from './calender.service';
import sendResponse from '../../utils/sendResponse';

const createCalender = catchAsync(async (req: Request, res: Response) => {
  const result = await calenderService.createCalender(req.body);
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Calender created successfully',
    data: result,
  });
});

const getAllCalender = catchAsync(async (req: Request, res: Response) => {
  const result = await calenderService.getAllCalender(req.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'All calender fetched successfully',
    data: result,
  });
});

const getCalenderById = catchAsync(async (req: Request, res: Response) => {
  const result = await calenderService.getCalenderById(req.params.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Calender fetched successfully',
    data: result,
  });
});
const updateCalender = catchAsync(async (req: Request, res: Response) => {
  const result = await calenderService.updateCalender(req.params.id, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Calender updated successfully',
    data: result,
  });
});

const deleteCalender = catchAsync(async (req: Request, res: Response) => {
  const result = await calenderService.deleteCalender(req.params.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Calender deleted successfully',
    data: result,
  });
});

const getAvailability = catchAsync(async (req: Request, res: Response) => {
  const result = await calenderService.getAvailability(
    req.params.apartmentId,
    req?.query?.date as string,
  );
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Calender deleted successfully',
    data: result,
  });
});

export const calenderController = {
  createCalender,
  getAllCalender,
  getCalenderById,
  updateCalender,
  deleteCalender,
  getAvailability,
};
