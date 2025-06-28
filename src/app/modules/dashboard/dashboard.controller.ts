import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import { dashboardService } from './dashboard.service';
import sendResponse from '../../utils/sendResponse';
import { storeFile } from '../../utils/fileHelper';
import { uploadToS3 } from '../../utils/s3';

const getHotelOwnerDashboard = catchAsync(
  async (req: Request, res: Response) => {
    const result = await dashboardService.getHotelOwnerDashboard(
      req.query,
      req.user.userId,
    );
    sendResponse(res, {
      statusCode: 201,
      success: true,
      message: 'Hotel owner dashboard data get successfully',
      data: result,
    });
  },
);

const getHotelOwnerEarning = catchAsync(async (req: Request, res: Response) => {
  const result = await dashboardService.getHotelOwnerEarning(
    req.query,
    req.user.userId,
  );
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Hotel owner earning data get successfully',
    data: result,
  });
});
const getAdminDashboard = catchAsync(async (req: Request, res: Response) => {
  const result = await dashboardService.getAdminDashboard(req.query);
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'admin dashboard data get successfully',
    data: result,
  });
});
const getAdminEarning = catchAsync(async (req: Request, res: Response) => {
  const result = await dashboardService.getAdminEarning(req.query);
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Admin earning data get successfully',
    data: result,
  });
});

export const dashboardController = {
  getHotelOwnerDashboard,
  getHotelOwnerEarning,
  getAdminDashboard,
  getAdminEarning,
};
