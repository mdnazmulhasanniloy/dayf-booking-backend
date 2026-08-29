import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import { apartmentService } from './apartment.service';
import sendResponse from '../../utils/sendResponse';
import { notificationQueue } from '../../redis';
import { modeType } from '../notification/notification.interface';
import { APARTMENT_STATUS } from './apartment.constants';

const createApartment = catchAsync(async (req: Request, res: Response) => {
  req.body.author = req?.user?.userId;
  const result = await apartmentService.createApartment(req.body, req.files);
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Apartment created successfully',
    data: result,
  });
});

const getAllApartment = catchAsync(async (req: Request, res: Response) => {
  const result = await apartmentService.getAllApartment(req.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'All apartment fetched successfully',
    data: result,
  });
});

const getMyApartment = catchAsync(async (req: Request, res: Response) => {
  req.query.author = req?.user?.userId;
  const result = await apartmentService.getAllApartment(req.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'All apartment fetched successfully',
    data: result,
  });
});

const getApartmentById = catchAsync(async (req: Request, res: Response) => {
  const result = await apartmentService.getApartmentById(req.params.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Apartment fetched successfully',
    data: result,
  });
});

const updateApartment = catchAsync(async (req: Request, res: Response) => {
  const result = await apartmentService.updateApartment(
    req.params.id,
    req.body,
    req.files,
  );
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Apartment updated successfully',
    data: result,
  });
});

const approvedApartment = catchAsync(async (req: Request, res: Response) => {
  const result = await apartmentService.updateApartment(req.params.id, {
    status: APARTMENT_STATUS.approved,
  });

  const ownerNotification = {
    receiver: result.author,
    message: 'Property approved',
    description: `Your property, ${result.name || 'the submitted property'}, has been approved and is now available for bookings.`,
    refference: result?._id,
    model_type: modeType.Apartment,
  };

  await notificationQueue.add('new_notification', ownerNotification);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Apartment updated successfully',
    data: result,
  });
});
const declinedApartment = catchAsync(async (req: Request, res: Response) => {
  const result = await apartmentService.updateApartment(req.params.id, {
    status: APARTMENT_STATUS.declined,
  });

  const ownerNotification = {
    receiver: result.author,
    message: 'Property approval declined',
    description: `Your property, ${result.name || 'the submitted property'}, was not approved. Please review the listing details and submit it again after making the necessary updates.`,
    refference: result?._id,
    model_type: modeType.Apartment,
  };

  await notificationQueue.add('new_notification', ownerNotification);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Apartment updated successfully',
    data: result,
  });
});

const deleteApartment = catchAsync(async (req: Request, res: Response) => {
  const result = await apartmentService.deleteApartment(req.params.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Apartment deleted successfully',
    data: result,
  });
});

export const apartmentController = {
  createApartment,
  getAllApartment,
  getApartmentById,
  updateApartment,
  deleteApartment,
  getMyApartment,
  approvedApartment,
  declinedApartment,
};
