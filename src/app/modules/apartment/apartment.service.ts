import httpStatus from 'http-status';
import { IApartment } from './apartment.interface';
import Apartment from './apartment.models';
import QueryBuilder from '../../builder/QueryBuilder';
import AppError from '../../error/AppError';
import { deleteManyFromS3, uploadManyToS3, uploadToS3 } from '../../utils/s3';

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
  query['isDeleted'] = false;
  const apartmentModel = new QueryBuilder(Apartment.find(), query)
    .search(['name'])
    .filter()
    .paginate()
    .sort()
    .fields();

  const data = await apartmentModel.modelQuery;
  const meta = await apartmentModel.countTotal();

  return {
    data,
    meta,
  };
};

const getApartmentById = async (id: string) => {
  const result = await Apartment.findById(id);
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
