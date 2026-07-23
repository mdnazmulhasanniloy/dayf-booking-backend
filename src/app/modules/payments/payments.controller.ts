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

const chargilyConfirmPayment = catchAsync(
  async (req: Request, res: Response) => {
    console.log(req.query);
    const result = await paymentsService.chargilyConfirmPayment(
      req.body,
      req.query.paymentId as string,
    );
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      data: result,
      message: 'payment link get successful',
    });
  },
);

const confirmPayment = catchAsync(async (req: Request, res: Response) => {
  const result = await paymentsService.confirmPayment(req?.query, res);
  if (result?.device === 'website') {
    return res.redirect(
      `${config.client_Url}/booking/success?paymentId=${result?._id}`,
    );
  }
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    data: result,
    message: 'payment successful',
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

const downloadReceipt = catchAsync(async (req: Request, res: Response) => {
  const pdfBuffer = await paymentsService.downloadReceipt(
    req.params.paymentId,
  );

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="receipt-${req?.params?.paymentId}.pdf"`,
  );
  res.setHeader('Content-Length', pdfBuffer.length.toString());
  res.setHeader('Cache-Control', 'private, no-store');
  return res.end(pdfBuffer);
});
export const paymentsController = {
  getAllPayments,
  getPaymentsById,
  updatePayments,
  deletePayments,
  confirmPayment,
  checkout,
  chargilyConfirmPayment,
  downloadReceipt,
};
