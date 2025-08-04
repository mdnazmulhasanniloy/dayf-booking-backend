import httpStatus from 'http-status';
import { IProperty } from './property.interface';
import Property from './property.models';
import AppError from '../../error/AppError';
import { deleteManyFromS3, uploadManyToS3, uploadToS3 } from '../../utils/s3';
import pickQuery from '../../utils/pickQuery';
import { Types } from 'mongoose';
import { paginationHelper } from '../../helpers/pagination.helpers';
import Apartment from '../apartment/apartment.models';
import generateRandomString from '../../utils/generateRandomString';

const createProperty = async (payload: IProperty, files: any) => {
  if (files) {
    const { images, coverImage, profile } = files;

    if (images?.length) {
      const imgsArray: { file: any; path: string; key?: string }[] = [];

      images?.map(async (image: any) => {
        imgsArray.push({
          file: image,
          path: `images/property`,
        });
      });

      payload.images = await uploadManyToS3(imgsArray);
    }

    if (coverImage) {
      payload.coverImage = (await uploadToS3({
        file: coverImage[0],
        fileName: `images/property/cover/${generateRandomString(5)}`,
      })) as string;
    }

    if (profile) {
      payload.profile = (await uploadToS3({
        file: profile[0],
        fileName: `images/property/profile/${generateRandomString(5)}`,
      })) as string;
    }
  }

  const result = await Property.create(payload);
  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to create property');
  }
  return result;
};

const getAllProperty = async (query: Record<string, any>) => {
  const { filters, pagination } = await pickQuery(query);

  const {
    searchTerm,
    latitude,
    longitude,
    ratingsFilter,
    facilities,
    ...filtersData
  } = filters;

  if (filtersData?.author) {
    filtersData['author'] = new Types.ObjectId(filtersData?.author);
  }

  if (filtersData?.facilities) {
    filtersData['facilities'] = new Types.ObjectId(filtersData?.facilities);
  }

  if (filtersData?.reviews) {
    filtersData['reviews'] = new Types.ObjectId(filtersData?.reviews);
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
        maxDistance: parseFloat(5 as unknown as string) * 1609, // 5 miles to meters
        distanceField: 'dist.calculated',
        spherical: true,
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
        $or: ['name', 'Other', 'address'].map(field => ({
          [field]: {
            $regex: searchTerm,
            $options: 'i',
          },
        })),
      },
    });
  }

  if (Object.entries(filtersData).length) {
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

        // {
        // $addFields: {
        // priceRange: {
        //   $cond: {
        //     if: { $gt: [{ $size: '$rooms' }, 0] },
        //     then: {
        //       min: { $min: '$rooms.pricePerNight' },
        //       max: { $max: '$rooms.pricePerNight' },
        //     },
        //     else: null,
        //   },
        // },
        // },
        // },
      ],
    },
  });

  const [result] = await Property.aggregate(pipeline);

  const total = result?.totalData?.[0]?.total || 0;
  const data = result?.paginatedData || [];

  return {
    meta: { page, limit, total },
    data,
  };
};

const getPropertyById = async (id: string) => {
  const result = await Property.findById(id).populate([
    { path: 'author', select: 'name email profile phoneNumber address' },
    // { path: 'rooms' },
    { path: 'reviews' },
    { path: 'facilities' },
  ]);
  if (!result || result?.isDeleted) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Property not found!');
  }
  return result;
};

const updateProperty = async (
  id: string,
  payload: Partial<IProperty> & { deleteKey?: string[] },
  files: any,
) => {
  const updatePayload: Partial<IProperty> = { ...payload };

  // Handle file uploads
  if (files) {
    const { images, coverImage, profile } = files;

    // Upload new images
    if (images?.length) {
      const imgsArray = images.map((image: any) => ({
        file: image,
        path: 'images/property',
      }));
      const uploadedImages = await uploadManyToS3(imgsArray);
      updatePayload.images = uploadedImages;
    }

    // Upload cover image
    if (coverImage?.length) {
      const uploadedCover = await uploadToS3({
        file: coverImage[0],
        fileName: `images/property/cover/${generateRandomString(5)}`,
      });
      updatePayload.coverImage = uploadedCover as string;
    }

    // Upload profile image
    if (profile?.length) {
      const uploadedProfile = await uploadToS3({
        file: profile[0],
        fileName: `images/property/profile/${generateRandomString(5)}`,
      });
      updatePayload.profile = uploadedProfile as string;
    }
  }

  // Handle image deletions from S3 and DB
  if (payload.deleteKey && payload.deleteKey.length > 0) {
    const fullKeysToDelete = payload.deleteKey.map(
      key => `images/property/${key}`,
    );
    await deleteManyFromS3(fullKeysToDelete);

    await Property.findByIdAndUpdate(id, {
      $pull: { images: { key: { $in: payload.deleteKey } } },
    });
  }

  // Push new images if available
  if (updatePayload.images && updatePayload.images.length > 0) {
    await Property.findByIdAndUpdate(id, {
      $push: { images: { $each: updatePayload.images } },
    });
    delete updatePayload.images; // avoid pushing again in the next update
  }

  // Final property update
  const result = await Property.findByIdAndUpdate(id, updatePayload, {
    new: true,
  });
  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to update Property');
  }

  return result;
};

const deleteProperty = async (id: string) => {
  const result = await Property.findByIdAndUpdate(
    id,
    { isDeleted: true },
    { new: true },
  );
  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to delete property');
  }
  return result;
};
const getHamePageData = async () => {
  // const topProperties = await Property.find({}).populate("facilities")
  //     .sort({ avgRating: -1 })
  //     .limit(10)
  //     .lean();
  const topProperties = await Property.aggregate([
    // Step 1: Match non-deleted properties
    { $match: { isDeleted: false } },

    {
      $lookup: {
        from: 'facilities',
        localField: 'facilities',
        foreignField: '_id',
        as: 'facilities',
      },
    },
    {
      $addFields: {
        isProperty: true,
      },
    },
    { $sort: { avgRating: -1 } },

    // Step 6: Limit result
    { $limit: 10 },
  ]);

  const topHotelRooms = await Apartment.find({ isDeleted: false })
    .populate('facilities')
    .sort({ avgRating: -1 })
    .limit(10)
    .lean();

  // Combine and shuffle using Array.sort and Math.random
  const mixedData = [...topProperties, ...topHotelRooms].sort(
    () => 0.5 - Math.random(),
  );

  return mixedData;
};

export const propertyService = {
  createProperty,
  getAllProperty,
  getPropertyById,
  updateProperty,
  deleteProperty,
  getHamePageData,
};
