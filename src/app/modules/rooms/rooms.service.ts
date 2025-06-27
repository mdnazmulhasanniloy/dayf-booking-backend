import httpStatus from 'http-status';
import { IRooms } from './rooms.interface';
import Rooms from './rooms.models';
import QueryBuilder from '../../builder/QueryBuilder';
import AppError from '../../error/AppError';
import { IRoomTypes } from '../roomTypes/roomTypes.interface';

const createRooms = async (payload: IRoomTypes) => {
  const result = await Rooms.create(payload);
  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Room creation failed');
  }

  return result;
};

const getAllRooms = async (query: Record<string, any>) => {
  const notificationModel = new QueryBuilder(
    Rooms.find({ isDeleted: true }).populate([
      { path: 'property' },
      { path: 'roomCategory' },
    ]),
    query,
  )
    .search([''])
    .filter()
    .paginate()
    .sort()
    .fields();

  const data = await notificationModel.modelQuery;
  const meta = await notificationModel.countTotal();
  return {
    data,
    meta,
  };
};

const getRoomsById = async (id: string) => {
  const result = await Rooms.findById(id).populate([
    { path: 'property' },
    { path: 'roomCategory' },
  ]);
  if (result?.isDeleted) {
    throw new AppError(httpStatus.BAD_REQUEST, 'This items is deleted');
  }
  return result;
};

const updateRooms = async (id: string, payload: Partial<IRooms>) => {
  const result = await Rooms.findByIdAndUpdate(id, payload, { new: true });
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
