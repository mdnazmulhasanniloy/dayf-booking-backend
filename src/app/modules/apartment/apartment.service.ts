import httpStatus from 'http-status';
import { IApartment } from './apartment.interface';
import Apartment from './apartment.models';
import AppError from '../../error/AppError';
import { deleteManyFromS3, uploadManyToS3, uploadToS3 } from '../../utils/s3';
import pickQuery from '../../utils/pickQuery';
import { Types } from 'mongoose';
import { paginationHelper } from '../../helpers/pagination.helpers';
import { User } from '../user/user.models';
import { IUser } from '../user/user.interface';
import { USER_ROLE } from '../user/user.constants';
import { modeType } from '../notification/notification.interface';
import { notificationQueue } from '../../redis';
import Calender from '../calender/calender.models';
import { BOOKING_MODEL_TYPE } from '../bookings/bookings.interface';
import moment from 'moment';

const createApartment = async (payload: IApartment, files: any) => {
  const author: IUser | null = await User.findById(payload?.author);
  if (!author) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'You are not a valid user');
  }
  if (files) {
    const { images, banner } = files;

    const imageFiles = images?.map((image: any) => ({
      file: image,
      path: 'images/apartment',
    }));

    const [uploadedImages, uploadedBanner] = await Promise.all([
      imageFiles?.length ? uploadManyToS3(imageFiles) : undefined,
      banner?.length
        ? uploadToS3({
            file: banner[0],
            fileName: `images/apartment/banner/${Math.floor(100000 + Math.random() * 900000)}`,
          })
        : undefined,
    ]);

    if (uploadedImages) payload.images = uploadedImages;
    if (uploadedBanner) payload.banner = uploadedBanner;
  }
  const result = await Apartment.create(payload);
  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to create apartment');
  }

  void (async () => {
    const admin = await User.findOne({ role: USER_ROLE.admin }).select('_id');
    if (!admin) return;

    await notificationQueue.add('new_notification', {
      receiver: admin._id,
      message: `Approval Request: ${result?.name || 'New Apartment'}`,
      description: `A user has submitted a new apartment for approval. Please review the listing and take the appropriate action.`,
      refference: result._id,
      model_type: modeType.Apartment,
    });
  })().catch(error => {
    console.error('Apartment notification enqueue failed:', error);
  });

  return result;
};

const getAllApartment = async (query: Record<string, any>) => {
  const { filters, pagination } = await pickQuery(query);

  const {
    searchTerm,
    latitude,
    longitude,
    facilities,
    priceRange, //10-100
    ratingsFilter,
    isApproved,
    guests,
    startDate,
    endDate,
    ...filtersData
  } = filters;

  if (filtersData?.author) {
    filtersData['author'] = new Types.ObjectId(filtersData?.author);
  }
  if (filtersData?._id) {
    filtersData['_id'] = new Types.ObjectId(filtersData?._id);
  }

  if (filtersData?.facility) {
    filtersData['facility'] = new Types.ObjectId(filtersData?.facility);
  }

  if (filtersData?.ratings) {
    filtersData['reviews'] = new Types.ObjectId(filtersData?.ratings);
  }

  if (isApproved) {
    filtersData['isApproved'] = isApproved === 'true' ? true : false;
  }

  // Initialize the aggregation pipeline
  const pipeline: any[] = [];

  // If latitude and longitude are provided, add $geoNear to the aggregation pipeline
  if (latitude && longitude) {
    pipeline.push({
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [parseFloat(longitude), parseFloat(latitude)],
        },
        key: 'location',
        maxDistance: parseFloat(50 as unknown as string) * 1609, // 5 miles to meters
        distanceField: 'dist.calculated',
        spherical: true,
      },
    });
  }

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
        $or: ['name', 'othersFacilities'].map(field => ({
          [field]: {
            $regex: searchTerm,
            $options: 'i',
          },
        })),
      },
    });
  }

  if (priceRange) {
    const [low, high] = priceRange.split('-').map(Number);

    pipeline.push({
      $match: {
        price: { $gte: low, $lte: high },
      },
    });
  }

  if (ratingsFilter) {
    const ratingsArray = ratingsFilter?.split(',').map(Number);
    pipeline.push({
      $match: {
        avgRating: { $in: ratingsArray },
      },
    });
  }

  if (facilities) {
    const facilitiesArray = facilities
      ?.split(',')
      .map((facility: string) => new Types.ObjectId(facility));
    pipeline.push({
      $match: {
        facilities: { $in: facilitiesArray },
      },
    });
  }

  if (guests) {
    pipeline.push({
      $match: {
        maxGuests: { $gte: Number(guests) },
      },
    });
  }
  if (Object.entries(filtersData).length) {
    if (startDate && endDate) {
      const bookedApartments = await Calender.aggregate([
        {
          $match: {
            modelType: BOOKING_MODEL_TYPE.Apartment,
            date: {
              $gte: moment(startDate).utc().startOf('day').toDate(),
              $lte: moment(endDate).utc().endOf('day').toDate(),
            },
          },
        },
        {
          $group: {
            _id: null,
            ids: {
              $addToSet: '$reference',
            },
          },
        },
        {
          $project: {
            _id: 0,
            ids: 1,
          },
        },
      ]);

      const idArray = bookedApartments[0]?.ids || [];

      pipeline.push({
        $match: {
          _id: {
            $nin: idArray,
          },
        },
      });
    }

    Object.entries(filtersData).forEach(([field, value]) => {
      if (/^\[.*?\]$/.test(value)) {
        const match = value.match(/\[(.*?)\]/);
        const queryValue = match ? match[1] : value;
        pipeline.push({
          $match: {
            [field]: { $in: [new Types.ObjectId(queryValue)] },
          },
        });
        delete filtersData[field];
      } else {
        // 🔁 Convert to number if numeric string
        if (!isNaN(value)) {
          filtersData[field] = Number(value);
        }
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

  pipeline.push({
    $addFields: {
      isBoosted: {
        $gt: ['$boostedUntil', new Date()],
      },
    },
  });

  if (sort) {
    const sortArray = sort.split(',').map(field => {
      const trimmedField = field.trim();
      if (trimmedField.startsWith('-')) {
        return { [trimmedField.slice(1)]: -1 };
      }
      return { [trimmedField]: 1 };
    });

    pipeline.push({
      $sort: { isBoosted: -1, ...Object.assign({}, ...sortArray) },
    });
  } else {
    pipeline.push({ $sort: { isBoosted: -1, createdAt: -1 } });
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
                  stripeAccountId: 1,
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
            // facility: { $arrayElemAt: ['$facility', 0] },
            // ratings: { $arrayElemAt: ['$ratings', 0] },
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
};

const getApartmentById = async (id: string) => {
  const result = await Apartment.findById(id).populate([
    {
      path: 'author',
      select: 'name email phoneNumber profile role stripeAccountId',
    },
    { path: 'facilities' },
    {
      path: 'reviews',
      populate: [
        { path: 'user', select: 'name email phoneNumber profile role' },
      ],
    },
  ]);
  if (!result || result?.isDeleted) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Apartment not found!');
  }
  return result;
};

const updateApartment = async (
  id: string,
  payload: Partial<IApartment> & { deleteKey?: string[] },
  files?: any,
) => {
  const updatePayload: any = { ...payload }; // Safe copy

  // Handle file uploads
  if (files) {
    const { images, banner, coverImage } = files;

    // Handle multiple apartment images
    if (images?.length) {
      const imgsArray: { file: any; path: string; key?: string }[] = images.map(
        (image: any) => ({
          file: image,
          path: 'images/apartment',
        }),
      );

      const uploadedImages = await uploadManyToS3(imgsArray);
      updatePayload.images = uploadedImages;
    }

    // Handle profile image
    if (banner?.length) {
      const uploadedProfile = await uploadToS3({
        file: banner[0],
        fileName: `images/apartment/banner/${Math.floor(100000 + Math.random() * 900000)}`,
      });
      updatePayload.banner = uploadedProfile as string;
    }
  }

  // Handle image deletions
  if (payload.deleteKey && payload.deleteKey.length > 0) {
    const fullKeysToDelete = payload.deleteKey.map(
      key => `images/apartment${key}`,
    );
    await deleteManyFromS3(fullKeysToDelete);

    await Apartment.findByIdAndUpdate(id, {
      $pull: { images: { key: { $in: payload.deleteKey } } },
    });
  }

  // Push new images if any
  if (updatePayload.images && updatePayload.images.length > 0) {
    await Apartment.findByIdAndUpdate(id, {
      $push: { images: { $each: updatePayload.images } },
    });
    delete updatePayload.images;
  }

  // Final update
  const result = await Apartment.findByIdAndUpdate(id, updatePayload, {
    new: true,
  });

  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to update Apartment');
  }
  return result;
};

const deleteApartment = async (id: string) => {
  const result = await Apartment.findByIdAndUpdate(
    id,
    { isDeleted: true },
    { new: true },
  );
  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to delete apartment');
  }
  return result;
};

export const apartmentService = {
  createApartment,
  getAllApartment,
  getApartmentById,
  updateApartment,
  deleteApartment,
};
