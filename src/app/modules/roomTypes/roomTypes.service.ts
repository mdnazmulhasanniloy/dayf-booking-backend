import httpStatus from 'http-status';
import { IRoomTypes } from './roomTypes.interface';
import RoomTypes from './roomTypes.models';
import AppError from '../../error/AppError';
import { startSession, Types } from 'mongoose';
import { deleteManyFromS3, uploadManyToS3 } from '../../utils/s3';
import Rooms from '../rooms/rooms.models';
import { paginationHelper } from '../../helpers/pagination.helpers';
import { BOOKING_MODEL_TYPE } from '../bookings/bookings.interface';
import moment from 'moment';
import Bookings from '../bookings/bookings.models';
import pickQuery from '../../utils/pickQuery';
import Property from '../property/property.models';
import Apartment from '../apartment/apartment.models';

const createRoomTypes = async (payload: IRoomTypes, files: any) => {
  const session = await startSession();
  try {
    session.startTransaction();

    const property = await Property.findById(payload?.property).session(
      session,
    ); // ✅ Fixed here

    if (!property) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Property not found');
    }

    payload.location = property.location;

    if (files?.images) {
      const images = Array.isArray(files.images)
        ? files.images
        : [files.images];

      const imgsArray = images.map((image: any) => ({
        file: image,
        path: `images/property`,
      }));

      payload.images = await uploadManyToS3(imgsArray);
    }

    const [roomType] = await RoomTypes.create([payload], { session });

    if (!roomType) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Failed to create room type');
    }

    await session.commitTransaction();
    return roomType;
  } catch (error: any) {
    await session.abortTransaction();
    throw new AppError(httpStatus.BAD_REQUEST, error?.message);
  } finally {
    session.endSession();
  }
};

const getAllRoomTypes = async (query: Record<string, any>) => {
  const { filters, pagination } = await pickQuery(query);

  const {
    searchTerm,
    facilities,
    priceRange,
    ratingsFilter,
    adults,
    children,
    infants,
    startDate,
    endDate,
    latitude,
    longitude,
    ...filtersData
  } = filters;

  if (filtersData?.author) {
    filtersData['author'] = new Types.ObjectId(filtersData?.author);
  }
  if (filtersData?.property) {
    filtersData['property'] = new Types.ObjectId(filtersData?.property);
  }

  if (filtersData?.facility) {
    filtersData['facility'] = new Types.ObjectId(filtersData?.facility);
  }

  const pipeline: any[] = [];

  if (latitude && longitude) {
    pipeline.push({
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [parseFloat(longitude), parseFloat(latitude)],
        },
        key: 'location',
        maxDistance: parseFloat(5 as unknown as string) * 1609, // 5 miles to meters
        distanceField: 'dist.calculated',
        spherical: true,
      },
    });
  }

  pipeline.push({ $match: { isDeleted: false } });
  if (searchTerm) {
    pipeline.push({
      $match: {
        $or: ['name', 'othersFacilities'].map(field => ({
          [field]: { $regex: searchTerm, $options: 'i' },
        })),
      },
    });
  }

  if (priceRange) {
    const [low, high] = priceRange.split('-').map(Number);
    pipeline.push({ $match: { pricePerNight: { $gte: low, $lte: high } } });
  }

  if (facilities) {
    const facilitiesArray = facilities
      ?.split(',')
      .map((facility: string) => new Types.ObjectId(facility));
    pipeline.push({ $match: { facilities: { $in: facilitiesArray } } });
  }

  // Step 1: Fetch booked rooms
  let bookedApartments: { id: Types.ObjectId; totalRooms: number }[] = [];
  if (startDate && endDate) {
    bookedApartments = await Bookings.aggregate([
      {
        $match: {
          modelType: BOOKING_MODEL_TYPE.Rooms,
          isDeleted: false,
          startDate: { $lte: moment(endDate).utc().toDate() },
          endDate: { $gte: moment(startDate).utc().toDate() },
        },
      },
      {
        $group: {
          _id: '$reference',
          totalRooms: { $sum: '$totalRooms' },
        },
      },
      {
        $project: {
          _id: 0,
          id: '$_id',
          totalRooms: 1,
        },
      },
    ]);
  }

  // Step 2: Compute availableRooms dynamically
  if (startDate && endDate) {
    pipeline.push({
      $addFields: {
        matchedBooking: {
          $arrayElemAt: [
            {
              $filter: {
                input: bookedApartments,
                as: 'b',
                cond: { $eq: ['$$b.id', '$_id'] },
              },
            },
            0,
          ],
        },
      },
    });

    pipeline.push({
      $addFields: {
        availableRooms: {
          $cond: {
            if: { $gt: ['$matchedBooking.totalRooms', 0] },
            then: {
              $subtract: ['$totalRooms', '$matchedBooking.totalRooms'],
            },
            else: '$totalRooms',
          },
        },
      },
    });

    pipeline.push({
      $match: {
        availableRooms: { $gt: 0 },
      },
    });

    pipeline.push({
      $project: {
        matchedBooking: 0,
      },
    });
  }

  if (adults || children || infants) {
    pipeline.push({
      $match: {
        'guests.adult': adults ? { $gte: Number(adults) } : { $gte: 0 },
        'guests.children': children ? { $gte: Number(children) } : { $gte: 0 },
        'guests.infants': infants ? { $gte: Number(infants) } : { $gte: 0 },
      },
    });
  }

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

  const { page, limit, skip, sort } =
    paginationHelper.calculatePagination(pagination);

  if (sort) {
    const sortArray = sort.split(',').map(field => {
      const trimmed = field.trim();
      return trimmed.startsWith('-')
        ? { [trimmed.slice(1)]: -1 }
        : { [trimmed]: 1 };
    });
    pipeline.push({ $sort: Object.assign({}, ...sortArray) });
  }

  pipeline.push({
    $facet: {
      totalData: [{ $count: 'total' }],
      paginatedData: [
        { $skip: skip },
        { $limit: limit },
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
            from: 'facilities',
            localField: 'facilities',
            foreignField: '_id',
            as: 'facilities',
          },
        },
        {
          $lookup: {
            from: 'properties',
            localField: 'property',
            foreignField: '_id',
            as: 'property',
          },
        },
        {
          $addFields: {
            author: { $arrayElemAt: ['$author', 0] },
            property: { $arrayElemAt: ['$property', 0] },
          },
        },
      ],
    },
  });

  const [result] = await RoomTypes.aggregate(pipeline);
  const total = result?.totalData?.[0]?.total || 0;
  const data = result?.paginatedData || [];

  return {
    meta: { page, limit, total },
    data,
  };
};

//global search
const globalSearch = async (query: Record<string, any>) => {
  const { filters, pagination } = await pickQuery(query);

  const {
    adults,
    children,
    infants,
    startDate,
    endDate,
    latitude,
    longitude,
    searchType,
  } = filters;
  const pipeline: any[] = [];

  if (latitude && longitude) {
    pipeline.push({
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [parseFloat(longitude), parseFloat(latitude)],
        },
        key: 'location',
        maxDistance: parseFloat(5 as unknown as string) * 1609, // 5 miles to meters
        distanceField: 'dist.calculated',
        spherical: true,
      },
    });
  }

  pipeline.push({ $match: { isDeleted: false } });

  if (searchType === 'Property') {
    // Step 1: Fetch booked rooms
    let bookedApartments: { id: Types.ObjectId; totalRooms: number }[] = [];
    if (startDate && endDate) {
      bookedApartments = await Bookings.aggregate([
        {
          $match: {
            modelType: BOOKING_MODEL_TYPE.Rooms,
            isDeleted: false,
            startDate: { $lte: moment(endDate).utc().toDate() },
            endDate: { $gte: moment(startDate).utc().toDate() },
          },
        },
        {
          $group: {
            _id: '$reference',
            totalRooms: { $sum: '$totalRooms' },
          },
        },
        {
          $project: {
            _id: 0,
            id: '$_id',
            totalRooms: 1,
          },
        },
      ]);
    }

    // Step 2: Compute availableRooms dynamically
    if (startDate && endDate) {
      pipeline.push({
        $addFields: {
          matchedBooking: {
            $arrayElemAt: [
              {
                $filter: {
                  input: bookedApartments,
                  as: 'b',
                  cond: { $eq: ['$$b.id', '$_id'] },
                },
              },
              0,
            ],
          },
        },
      });

      pipeline.push({
        $addFields: {
          availableRooms: {
            $cond: {
              if: { $gt: ['$matchedBooking.totalRooms', 0] },
              then: {
                $subtract: ['$totalRooms', '$matchedBooking.totalRooms'],
              },
              else: '$totalRooms',
            },
          },
        },
      });

      pipeline.push({
        $match: {
          availableRooms: { $gt: 0 },
        },
      });

      pipeline.push({
        $project: {
          matchedBooking: 0,
        },
      });
    }

    if (adults || children || infants) {
      pipeline.push({
        $match: {
          'guests.adult': adults ? { $gte: Number(adults) } : { $gte: 0 },
          'guests.children': children
            ? { $gte: Number(children) }
            : { $gte: 0 },
          'guests.infants': infants ? { $gte: Number(infants) } : { $gte: 0 },
        },
      });
    }

    pipeline.push({
      $group: {
        _id: '$property',
      },
    });

    const { page, limit, skip, sort } =
      paginationHelper.calculatePagination(pagination);

    if (sort) {
      const sortArray = sort.split(',').map(field => {
        const trimmed = field.trim();
        return trimmed.startsWith('-')
          ? { [trimmed.slice(1)]: -1 }
          : { [trimmed]: 1 };
      });
      pipeline.push({ $sort: Object.assign({}, ...sortArray) });
    }

    pipeline.push({
      $facet: {
        totalData: [{ $count: 'total' }],
        paginatedData: [
          { $skip: skip },
          { $limit: limit },

          {
            $lookup: {
              from: 'properties',
              localField: '_id',
              foreignField: '_id',
              as: 'property',
            },
          },
          { $unwind: '$property' },
          {
            $project: {
              _id: 0,
              property: 1,
            },
          },
          {
            $replaceRoot: {
              newRoot: '$property',
            },
          },

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
              from: 'facilities',
              localField: 'facilities',
              foreignField: '_id',
              as: 'facilities',
            },
          },
          {
            $lookup: {
              from: 'reviews',
              localField: 'reviews',
              foreignField: '_id',
              as: 'reviews',
            },
          },

          //add extra field fro max and min price
          {
            $lookup: {
              from: 'roomtypes',
              localField: '_id',
              foreignField: 'property',
              as: 'roomTypes',
              pipeline: [
                { $match: { isDeleted: false } },
                { $project: { pricePerNight: 1 } },
              ],
            },
          },

          {
            $addFields: {
              minPrice: {
                $cond: [
                  { $gt: [{ $size: '$roomTypes' }, 0] },
                  { $min: '$roomTypes.pricePerNight' },
                  null,
                ],
              },
              maxPrice: {
                $cond: [
                  { $gt: [{ $size: '$roomTypes' }, 0] },
                  { $max: '$roomTypes.pricePerNight' },
                  null,
                ],
              },
            },
          },

          {
            $project: {
              roomTypes: 0,
            },
          },

          {
            $addFields: {
              author: { $arrayElemAt: ['$author', 0] },
            },
          },
        ],
      },
    });

    const [result] = await RoomTypes.aggregate(pipeline);
    const total = result?.totalData?.[0]?.total || 0;
    const data = result?.paginatedData || [];

    return {
      meta: { page, limit, total },
      data,
    };
  } else if (searchType === 'Apartment') {
    if (startDate && endDate) {
      const bookedApartments = await Bookings.aggregate([
        {
          $match: {
            modelType: BOOKING_MODEL_TYPE.Apartment,
            isDeleted: false,
            startDate: { $lte: moment(endDate).utc().toDate() }, // booking start <= searchEndDate
            endDate: { $gte: moment(startDate).utc().toDate() }, // booking end >= searchStartDate
          },
        },
        {
          $group: {
            _id: null,
            ids: { $push: { $toString: '$reference' } },
          },
        },
        {
          $project: {
            _id: 0,
            ids: 1,
          },
        },
      ]);
      const idArray =
        bookedApartments[0]?.ids?.map((id: string) => new Types.ObjectId(id)) ||
        [];
      console.log(idArray);
      pipeline.push({
        $match: {
          _id: { $nin: idArray },
        },
      });
    }

    if (adults || children || infants) {
         pipeline.push({
           $match: {
             'guests.adult': adults ? { $gte: Number(adults) } : { $gte: 0 },
             'guests.children': children
               ? { $gte: Number(children) }
               : { $gte: 0 },
             'guests.infants': infants
               ? { $gte: Number(infants) }
               : { $gte: 0 },
           },
         });
      // pipeline.push({
      //   $match: {
      //     guests: {
      //       adult: adults ? { $gte: adults } : { $gte: 0 },
      //       children: children ? { $gte: children } : { $gte: 0 },
      //       infants: infants ? { $gte: infants } : { $gte: 0 },
      //     },
      //   },
      // });
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
              from: 'facilities',
              localField: 'facilities',
              foreignField: '_id',
              as: 'facilities',
            },
          },
          {
            $lookup: {
              from: 'reviews',
              localField: 'reviews',
              foreignField: '_id',
              as: 'reviews',
            },
          },

          {
            $addFields: {
              author: { $arrayElemAt: ['$author', 0] },
            },
          },
        ],
      },
    });

    const [result] = await Apartment.aggregate(pipeline);

    const total = result?.totalData?.[0]?.total || 0;
    const data = result?.paginatedData || [];

    return {
      meta: { page, limit, total },
      data,
    };
  } else {
    throw new AppError(httpStatus.BAD_REQUEST, 'please select a search type');
  }
};

const getRoomTypesById = async (id: string) => {
  const result = await RoomTypes.findById(id).populate([
    { path: 'property' },
    { path: 'author', select: 'name email phoneNumber profile role' },
    { path: 'facilities' },
  ]);
  if (!result || result?.isDeleted) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Rooms not found!');
  }
  return result;
};

const updateRoomTypes = async (
  id: string,
  payload: Partial<IRoomTypes>,
  files: any,
) => {
  const { deleteKey, ...updateData } = payload;

  const update: any = { ...updateData };

  if (files) {
    const { images } = files;

    if (images?.length) {
      const imgsArray: { file: any; path: string; key?: string }[] = [];

      images.map((image: any) =>
        imgsArray.push({
          file: image,
          path: `images/rooms`,
        }),
      );

      payload.images = await uploadManyToS3(imgsArray);
    }
  }

  if (deleteKey && deleteKey.length > 0) {
    const newKey: string[] = [];
    deleteKey.map((key: any) => newKey.push(`images/rooms/${key}`));
    if (newKey?.length > 0) {
      await deleteManyFromS3(newKey);
    }

    await RoomTypes.findByIdAndUpdate(id, {
      $pull: { images: { key: { $in: deleteKey } } },
    });
  }

  if (payload?.images && payload.images.length > 0) {
    await RoomTypes.findByIdAndUpdate(id, {
      $push: { images: { $each: payload.images } },
    });
  }

  const result = await RoomTypes.findByIdAndUpdate(id, update, { new: true });
  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to update Rooms');
  }
  return result;
};

const deleteRoomTypes = async (id: string) => {
  const result = await RoomTypes.findByIdAndUpdate(
    id,
    { isDeleted: true },
    { new: true },
  );
  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to delete rooms');
  }
  return result;
};

export const roomTypesService = {
  createRoomTypes,
  getAllRoomTypes,
  getRoomTypesById,
  updateRoomTypes,
  deleteRoomTypes,
  globalSearch,
};
