import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { refundRequestService } from './refundRequest.service';

const createCancellationRequest = catchAsync(
  async (req: Request, res: Response) => {
    const result = await refundRequestService.createCancellationRequest(
      req.params.bookingId,
      req.user.userId,
      req.body.reason,
    );
    sendResponse(res, {
      statusCode: 201,
      success: true,
      message: 'Cancellation and refund request created successfully',
      data: result,
    });
  },
);

const createHostCancellation = catchAsync(
  async (req: Request, res: Response) => {
    const result = await refundRequestService.createHostCancellationAction(
      req.params.bookingId,
      req.user.userId,
      req.body.reason,
      'host_cancellation',
    );
    sendResponse(res, {
      statusCode: 201,
      success: true,
      message: 'Host cancellation created successfully',
      data: result,
    });
  },
);

const reportNoShow = catchAsync(async (req: Request, res: Response) => {
  const result = await refundRequestService.createHostCancellationAction(
    req.params.bookingId,
    req.user.userId,
    req.body.reason,
    'no_show',
  );
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'No-show report created successfully',
    data: result,
  });
});

const getMyRefundRequests = catchAsync(
  async (req: Request, res: Response) => {
    const result = await refundRequestService.getMyRefundRequests(
      req.user.userId,
    );
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Refund requests fetched successfully',
      data: result,
    });
  },
);

const getAllRefundRequests = catchAsync(
  async (req: Request, res: Response) => {
    const result = await refundRequestService.getAllRefundRequests(req.query);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Refund requests fetched successfully',
      data: result,
    });
  },
);

const updateRefundRequest = catchAsync(
  async (req: Request, res: Response) => {
    const result = await refundRequestService.updateRefundRequest(
      req.params.id,
      req.user.userId,
      req.body,
    );
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Refund request updated successfully',
      data: result,
    });
  },
);

const getActivePolicy = catchAsync(async (_req: Request, res: Response) => {
  const result = await refundRequestService.getActivePolicy();
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Cancellation policy fetched successfully',
    data: result,
  });
});

const updateActivePolicy = catchAsync(
  async (req: Request, res: Response) => {
    const result = await refundRequestService.updateActivePolicy(req.body);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Cancellation policy updated successfully',
      data: result,
    });
  },
);

export const refundRequestController = {
  createCancellationRequest,
  createHostCancellation,
  reportNoShow,
  getMyRefundRequests,
  getAllRefundRequests,
  updateRefundRequest,
  getActivePolicy,
  updateActivePolicy,
};
