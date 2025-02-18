import httpStatus from 'http-status';
import { IRooms } from './rooms.interface';
import Rooms from './rooms.models';
import QueryBuilder from '../../builder/QueryBuilder';
import AppError from '../../error/AppError';
import { deleteManyFromS3, uploadManyToS3 } from '../../utils/s3';

const createRooms = async (payload: IRooms, files: any) => {
  if (files) {
    const { images } = files;

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
  }
  const result = await Rooms.create(payload);
  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to create rooms');
  }
  return result;
};

const getAllRooms = async (query: Record<string, any>) => {
  query['isDeleted'] = false;
  const roomsModel = new QueryBuilder(Rooms.find(), query)
    .search([''])
    .filter()
    .paginate()
    .sort()
    .fields();

  const data = await roomsModel.modelQuery;
  const meta = await roomsModel.countTotal();

  return {
    data,
    meta,
  };
};

const getRoomsById = async (id: string) => {
  const result = await Rooms.findById(id);
  if (!result || result?.isDeleted) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Rooms not found!');
  }
  return result;
};

const updateRooms = async (
  id: string,
  payload: Partial<IRooms>,
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
    deleteKey.map((key: any) => newKey.push(`images/rooms${key}`));
    if (newKey?.length > 0) {
      await deleteManyFromS3(newKey);
    }

    await Rooms.findByIdAndUpdate(id, {
      $pull: { banner: { key: { $in: deleteKey } } },
    });
  }

  if (payload?.images && payload.images.length > 0) {
    await Rooms.findByIdAndUpdate(id, {
      $push: { banner: { $each: payload.images } },
    });
  }

  const result = await Rooms.findByIdAndUpdate(id, update, { new: true });
  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to update Rooms');
  }
  return result;
};

const deleteRooms = async (id: string) => {
  const result = await Rooms.findByIdAndUpdate(
    id,
    { isDeleted: true },
    { new: true },
  );
  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to delete rooms');
  }
  return result;
};

export const roomsService = {
  createRooms,
  getAllRooms,
  getRoomsById,
  updateRooms,
  deleteRooms,
};
