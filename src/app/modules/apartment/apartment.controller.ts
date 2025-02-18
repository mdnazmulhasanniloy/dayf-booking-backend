import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import { apartmentService } from './apartment.service';
import sendResponse from '../../utils/sendResponse';

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
};
