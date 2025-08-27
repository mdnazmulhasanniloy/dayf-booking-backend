import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import { paymentsService } from './payments.service';
import sendResponse from '../../utils/sendResponse';
import httpStatus from 'http-status';
import config from '../../config';

const checkout = catchAsync(async (req: Request, res: Response) => {
  req.body.user = req.user.userId;
  const result = await paymentsService.checkout(req.body);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    data: result,
    message: 'payment link get successful',
  });
});

const confirmPayment = catchAsync(async (req: Request, res: Response) => { 
  const result = await paymentsService.confirmPayment(req?.query, res);
  // if (result?.device === 'website') {

  //   return res.redirect(
  //     `${config.client_Url}/booking/success?bookingId=${result?.bookings}`,
  //   );
  // }
  const paymentDetails = {
    transactionId: 'TXN-2024-001234', // Replace with actual transaction ID
    amount: '$99.99', // Replace with actual amount
    currency: 'USD', // Replace with currency if needed
    cardLast4: '4242', // Replace with actual card last 4 digits
    paymentDate: new Date().toLocaleString(), // Replace with actual date
  };
  // res.render('paymentSuccess', { paymentDetails });
  res.render('paymentSuccess', {
    paymentDetails: result?.paymentDetails,
    device: result?.device,
    bookingId: result?.bookings,
  });
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    data: result,
    message: 'payment successful',
  });
});

const createPayments = catchAsync(async (req: Request, res: Response) => {
  const result = await paymentsService.createPayments(req.body);
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Payments created successfully',
    data: result,
  });
});

const getAllPayments = catchAsync(async (req: Request, res: Response) => {
  const result = await paymentsService.getAllPayments(req.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'All payments fetched successfully',
    data: result,
  });
});

const getPaymentsById = catchAsync(async (req: Request, res: Response) => {
  const result = await paymentsService.getPaymentsById(req.params.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Payments fetched successfully',
    data: result,
  });
});
const updatePayments = catchAsync(async (req: Request, res: Response) => {
  const result = await paymentsService.updatePayments(req.params.id, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Payments updated successfully',
    data: result,
  });
});

const deletePayments = catchAsync(async (req: Request, res: Response) => {
  const result = await paymentsService.deletePayments(req.params.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Payments deleted successfully',
    data: result,
  });
});

export const paymentsController = {
  createPayments,
  getAllPayments,
  getPaymentsById,
  updatePayments,
  deletePayments,
  confirmPayment,
  checkout,
};
