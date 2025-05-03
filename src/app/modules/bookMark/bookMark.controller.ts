
import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';  
import { bookMarkService } from './bookMark.service';
import sendResponse from '../../utils/sendResponse'; 

const createBookMark = catchAsync(async (req: Request, res: Response) => {
  req.body.user=req.user.userId
 const result = await bookMarkService.createBookMark(req.body);
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'BookMark created successfully',
    data: result,
  });

});

const getAllBookMark = catchAsync(async (req: Request, res: Response) => {
req.query.user = req.user.userId
 const result = await bookMarkService.getAllBookMark(req.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'All bookMark fetched successfully',
    data: result,
  });

});

const getBookMarkById = catchAsync(async (req: Request, res: Response) => {
 const result = await bookMarkService.getBookMarkById(req.params.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'BookMark fetched successfully',
    data: result,
  });

});
const updateBookMark = catchAsync(async (req: Request, res: Response) => {
const result = await bookMarkService.updateBookMark(req.params.id, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'BookMark updated successfully',
    data: result,
  });

});


const deleteBookMark = catchAsync(async (req: Request, res: Response) => {
 const result = await bookMarkService.deleteBookMark(req.params.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'BookMark deleted successfully',
    data: result,
  });

});

export const bookMarkController = {
  createBookMark,
  getAllBookMark,
  getBookMarkById,
  updateBookMark,
  deleteBookMark,
};