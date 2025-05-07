import httpStatus from 'http-status';
import { IApartment } from './apartment.interface';
import Apartment from './apartment.models';
import AppError from '../../error/AppError';
import { deleteManyFromS3, uploadManyToS3, uploadToS3 } from '../../utils/s3';
import pickQuery from '../../utils/pickQuery';
import { Types } from 'mongoose';
import { paginationHelper } from '../../helpers/pagination.helpers';

const createApartment = async (payload: IApartment, files: any) => {
  if (files) {
    const { images, profile, coverImage } = files;

    if (images?.length) {
      const imgsArray: { file: any; path: string; key?: string }[] = [];

      images?.map(async (image: any) => {
        imgsArray.push({
          file: image,
          path: `images/apartment`,
        });
      });

      payload.images = await uploadManyToS3(imgsArray);
    }

    if (profile?.length) {
      payload.profile = (await uploadToS3({
        file: profile[0],
        fileName: `images/apartment/profile/${Math.floor(100000 + Math.random() * 900000)}`,
      })) as string;
    }
    if (coverImage?.length) {
      payload.coverImage = (await uploadToS3({
        file: coverImage[0],
        fileName: `images/apartment/cover-image/${Math.floor(100000 + Math.random() * 900000)}`,
      })) as string;
    }
  }

  const result = await Apartment.create(payload);
  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to create apartment');
  }
  return result;
};

const getAllApartment = async (query: Record<string, any>) => {
  const { filters, pagination } = await pickQuery(query);

  const { searchTerm, latitude, longitude, ...filtersData } = filters;

  if (filtersData?.author) {
    filtersData['author'] = new Types.ObjectId(filtersData?.author);
  }

  if (filtersData?.facility) {
    filtersData['facility'] = new Types.ObjectId(filtersData?.facility);
  }

  if (filtersData?.ratings) {
    filtersData['reviews'] = new Types.ObjectId(filtersData?.ratings);
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
        $or: ['name', 'Other'].map(field => ({
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
    { path: 'author', select: 'name email phoneNumber profile role' },
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
  payload: Partial<IApartment>,
  files: any,
) => {
  const { deleteKey, ...updateData } = payload;

  const update: any = { ...updateData };

  if (files) {
    const { images, profile, coverImage } = files;

    if (images?.length) {
      const imgsArray: { file: any; path: string; key?: string }[] = [];

      images.map((image: any) =>
        imgsArray.push({
          file: image,
          path: `images/apartment`,
        }),
      );

      payload.images = await uploadManyToS3(imgsArray);
    }

    if (profile?.length) {
      payload.profile = (await uploadToS3({
        file: profile[0],
        fileName: `images/apartment/profile/${Math.floor(100000 + Math.random() * 900000)}`,
      })) as string;
    }

    if (coverImage?.length) {
      payload.coverImage = (await uploadToS3({
        file: coverImage[0],
        fileName: `images/apartment/cover-image/${Math.floor(100000 + Math.random() * 900000)}`,
      })) as string;
    }
  }

  if (deleteKey && deleteKey.length > 0) {
    const newKey: string[] = [];
    deleteKey.map((key: any) => newKey.push(`images/apartment${key}`));
    if (newKey?.length > 0) {
      await deleteManyFromS3(newKey);
    }

    await Apartment.findByIdAndUpdate(id, {
      $pull: { images: { key: { $in: deleteKey } } },
    });
  }

  if (payload?.images && payload.images.length > 0) {
    await Apartment.findByIdAndUpdate(id, {
      $push: { images: { $each: payload.images } },
    });
  }
  const result = await Apartment.findByIdAndUpdate(id, update, { new: true });
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
