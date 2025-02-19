import httpStatus from 'http-status';
import { BOOKING_MODEL_TYPE, IBookings } from './bookings.interface';
import Bookings from './bookings.models';
import AppError from '../../error/AppError';
import Rooms from '../rooms/rooms.models';
import Apartment from '../apartment/apartment.models';
import { Types } from 'mongoose';
import pickQuery from '../../utils/pickQuery';
import { paginationHelper } from '../../helpers/pagination.helpers';
import moment from 'moment';
import { BOOKING_STATUS } from './bookings.constants';
import { notificationServices } from '../notification/notification.service';
import { modeType } from '../notification/notification.interface';

const createBookings = async (payload: IBookings) => {
  switch (payload.modelType) {
    case BOOKING_MODEL_TYPE.Rooms:
      const room: IBookings | null = await Rooms.findById(payload.reference);
      if (!room) {
        throw new AppError(httpStatus.BAD_REQUEST, 'Room not found!');
      }
      payload['author'] = room?.author;
      //@ts-ignore
      payload['reference'] = room?._id;
      payload['totalPrice'] = room?.totalPrice;
      break;
    case BOOKING_MODEL_TYPE.Apartment:
      const apartment: IBookings | null = await Apartment.findById(
        payload.reference,
      );
      if (!apartment) {
        throw new AppError(httpStatus.BAD_REQUEST, 'Apartment not found!');
      }
      payload['author'] = apartment?.author;
      //@ts-ignore
      payload['reference'] = apartment?._id;
      payload['totalPrice'] = apartment?.totalPrice;

      break;
    default:
      throw new AppError(httpStatus.BAD_REQUEST, 'booking model type invalid');
  }

  const result = await Bookings.create(payload);
  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to create bookings');
  }
  return result;
};

const getAllBookings = async (query: Record<string, any>) => {
  const { filters, pagination } = await pickQuery(query);

  const { searchTerm, ...filtersData } = filters;

  if (filtersData?.author) {
    filtersData['author'] = new Types.ObjectId(filtersData?.author);
  }

  if (filtersData?.reference) {
    filtersData['reference'] = new Types.ObjectId(filtersData?.reference);
  }

  if (filtersData?.user) {
    filtersData['user'] = new Types.ObjectId(filtersData?.user);
  }

  // Initialize the aggregation pipeline
  const pipeline: any[] = [];

  // If latitude and longitude are provided, add $geoNear to the aggregation pipeline

  // Add a match to exclude deleted documents
  pipeline.push({
    $match: {
      isDeleted: false,
    },
  });

  // If searchTerm is provided, add a search condition
  if (searchTerm) {
    pipeline.push({
      $match: {
        $or: ['id'].map(field => ({
          [field]: {
            $regex: searchTerm,
            $options: 'i',
          },
        })),
      },
    });
  }

  // Add custom filters (filtersData) to the aggregation pipeline
  if (Object.entries(filtersData).length) {
    Object.entries(filtersData).map(([field, value]) => {
      if (/^\[.*?\]$/.test(value)) {
        const match = value.match(/\[(.*?)\]/);
        const queryValue = match ? match[1] : value;
        pipeline.push({
          $match: {
            [field]: { $in: [new Types.ObjectId(queryValue)] },
          },
        });
        delete filtersData[field];
      }
    });

    if (Object.entries(filtersData).length) {
      pipeline.push({
        $match: {
          $and: Object.entries(filtersData).map(([field, value]) => ({
            isDeleted: false,
            [field]: value,
          })),
        },
      });
    }
  }

  // Sorting condition
  const { page, limit, skip, sort } =
    paginationHelper.calculatePagination(pagination);

  if (sort) {
    const sortArray = sort.split(',').map(field => {
      const trimmedField = field.trim();
      if (trimmedField.startsWith('-')) {
        return { [trimmedField.slice(1)]: -1 };
      }
      return { [trimmedField]: 1 };
    });

    pipeline.push({ $sort: Object.assign({}, ...sortArray) });
  }

  pipeline.push({
    $facet: {
      totalData: [{ $count: 'total' }],
      paginatedData: [
        { $skip: skip },
        { $limit: limit },
        // Lookups
        {
          $lookup: {
            from: 'users',
            localField: 'author',
            foreignField: '_id',
            as: 'author',
            pipeline: [
              {
                $project: {
                  name: 1,
                  email: 1,
                  phoneNumber: 1,
                  profile: 1,
                },
              },
            ],
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'user',
            foreignField: '_id',
            as: 'user',
            pipeline: [
              {
                $project: {
                  name: 1,
                  email: 1,
                  phoneNumber: 1,
                  profile: 1,
                },
              },
            ],
          },
        },

        {
          $lookup: {
            from: {
              $cond: {
                if: { $eq: ['$modelType', BOOKING_MODEL_TYPE.Rooms] },
                then: BOOKING_MODEL_TYPE.Rooms,
                else: BOOKING_MODEL_TYPE.Apartment,
              },
            },
            // from: 'reference',
            localField: 'reference',
            foreignField: '_id',
            as: 'reference',
            pipeline: [
              {
                $con: {
                  if: { $eq: ['$modelType', BOOKING_MODEL_TYPE.Rooms] },
                  then: {
                    $lookup: {
                      from: 'property',
                      localField: 'property',
                      foreignField: '_id',
                      as: 'property',
                    },
                    $addFields: {
                      property: { $arrayElemAt: ['$property', 0] },
                    },
                  },
                },
              },
            ],
          },
        },

        {
          $addFields: {
            author: { $arrayElemAt: ['$author', 0] },
            user: { $arrayElemAt: ['$user', 0] },
            reference: { $arrayElemAt: ['$reference', 0] },
          },
        },
      ],
    },
  });

  const [result] = await Bookings.aggregate(pipeline);

  const total = result?.totalData?.[0]?.total || 0;
  const data = result?.paginatedData || [];

  return {
    meta: { page, limit, total },
    data,
  };
};

const getBookingsById = async (id: string) => {
  const result = await Bookings.findById(id).populate([
    { path: 'reference' },
    { path: 'user', select: 'name email profile phoneNumber' },
    { path: 'author', select: 'name email profile phoneNumber' },
  ]);
  if (!result || result?.isDeleted) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Bookings not found!');
  }
  return result;
};

const updateBookings = async (id: string, payload: Partial<IBookings>) => {
  const result = await Bookings.findByIdAndUpdate(id, payload, { new: true });
  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to update Bookings');
  }
  return result;
};

/**
 *
 * @param id booking id
 * @todo : payment return after success
 * @returns return success
 */
const cancelBooking = async (id: string) => {
  const isExist = await Bookings.findById(id);
  if (!isExist) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Booking not found!');
  }

  const duration = moment.duration(moment().diff(moment(isExist.createdAt)));
  if (duration.asHours() > 5) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Cancellation is not allowed more than 5 hours after the booking was made.',
    );
  }

  const result = await Bookings.findByIdAndUpdate(
    id,
    { status: BOOKING_STATUS.cancelled },
    { new: true },
  );

  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to cancel booking');
  }

  await notificationServices.insertNotificationIntoDb({
    receiver: result?.user,
    message: 'Booking Cancellation Confirmation',
    description: `Your booking with ID: ${result.id} has been successfully cancelled. If you have any questions or require further assistance, please contact our support team.`,
    refference: result?._id,
    model_type: modeType.Bookings,
  });
  await notificationServices.insertNotificationIntoDb({
    receiver: result?.author,
    message: 'Booking Cancellation Alert',
    description: `A booking has been cancelled. Booking ID: ${result.id} was scheduled from ${moment(isExist.startDate).format('MMMM Do YYYY')} to ${moment(isExist.endDate).format('MMMM Do YYYY')}. Please update your availability accordingly. If you need further details, please access your management dashboard or contact our support team.`,
    refference: result?._id,
    model_type: modeType.Bookings,
  });
  return result;
};
const deleteBookings = async (id: string) => {
  const result = await Bookings.findByIdAndUpdate(
    id,
    { isDeleted: true },
    { new: true },
  );
  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to delete bookings');
  }
  return result;
};

const completeBooking = async (id: string) => {
  const isExist = await Bookings.findById(id);
  if (!isExist) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Booking not found!');
  }

  const result = await Bookings.findByIdAndUpdate(
    id,
    { status: BOOKING_STATUS.completed },
    { new: true },
  );

  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to complete booking');
  }

  await notificationServices.insertNotificationIntoDb({
    receiver: result?.user,
    message: 'Booking Completion Confirmation',
    description: `Your booking with ID: ${result._id} has been successfully completed. Thank you for choosing our services. We hope you had a pleasant experience.`,
    refference: result?._id,
    model_type: modeType.Bookings,
  });
  await notificationServices.insertNotificationIntoDb({
    receiver: result?.author,
    message: 'Booking Completion Confirmation',
    description: `A booking at your property with ID: ${result._id} has been marked as completed.`,
    refference: result?._id,
    model_type: modeType.Bookings,
  });

  return result;
};

export const bookingsService = {
  createBookings,
  getAllBookings,
  getBookingsById,
  updateBookings,
  deleteBookings,
  cancelBooking,
  completeBooking,
};
