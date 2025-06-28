import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import { bookingsService } from './bookings.service';
import sendResponse from '../../utils/sendResponse';

const createBookings = catchAsync(async (req: Request, res: Response) => {
  req.body.user = req.user.userId;
  const result = await bookingsService.createBookings(req.body);
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Bookings created successfully',
    data: result,
  });
});

const getAllBookingsWithReference = catchAsync(
  async (req: Request, res: Response) => {
    req.query['reference'] = req.params.referenceId;
    const result = await bookingsService.getAllBookings(req.query);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'All bookings with reference fetched successfully',
      data: result,
    });
  },
);
const getBookingsForHotelOwner = catchAsync(
  async (req: Request, res: Response) => {
    req.query['author'] = req.user.userId;
    const result = await bookingsService.getAllBookings(req.query);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'All bookings with reference fetched successfully',
      data: result,
    });
  },
);

const getMyBookings = catchAsync(async (req: Request, res: Response) => {
  req.query['user'] = req.user.userId;
  const result = await bookingsService.getAllBookings(req.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'My booking fetched successfully',
    data: result,
  });
});

// const getAllBookingsForProperty = catchAsync(
//   async (req: Request, res: Response) => {
//     const result = await bookingsService.getAllBookingsForProperty(
//       req.params.propertyId,
//     );
//     sendResponse(res, {
//       statusCode: 200,
//       success: true,
//       message: 'All bookings for the property fetched successfully',
//       data: result,
//     });
//   },
// );

const getAllBookings = catchAsync(async (req: Request, res: Response) => {
  const result = await bookingsService.getAllBookings(req.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'All bookings fetched successfully',
    data: result,
  });
});

const getBookingsById = catchAsync(async (req: Request, res: Response) => {
  const result = await bookingsService.getBookingsById(req.params.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Bookings fetched successfully',
    data: result,
  });
});
const updateBookings = catchAsync(async (req: Request, res: Response) => {
  const result = await bookingsService.updateBookings(req.params.id, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Bookings updated successfully',
    data: result,
  });
});
const cancelBooking = catchAsync(async (req: Request, res: Response) => {
  const result = await bookingsService.cancelBooking(req.params.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Bookings canceled successfully',
    data: result,
  });
});
const completeBooking = catchAsync(async (req: Request, res: Response) => {
  const result = await bookingsService.completeBooking(req.params.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Bookings completed successfully',
    data: result,
  });
});

const deleteBookings = catchAsync(async (req: Request, res: Response) => {
  const result = await bookingsService.deleteBookings(req.params.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Bookings deleted successfully',
    data: result,
  });
});

export const bookingsController = {
  createBookings,
  getAllBookings,
  getBookingsById,
  updateBookings,
  deleteBookings,
  getAllBookingsWithReference,
  getMyBookings,
  completeBooking,
  cancelBooking,
  getBookingsForHotelOwner,
};
