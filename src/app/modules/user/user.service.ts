/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import AppError from '../../error/AppError';
import { IUser } from './user.interface';
import { User } from './user.models';
import QueryBuilder from '../../builder/QueryBuilder';
export type IFilter = {
  searchTerm?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
};
const createUser = async (payload: IUser): Promise<IUser> => {
  const isExist = await User.isUserExist(payload.email as string);

  if (isExist) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'User already exists with this email',
    );
  }

  // if (payload?.isGoogleLogin) {
  //   payload.verification = {
  //     otp: 0,
  //     expiresAt: new Date(Date.now()),
  //     status: true,
  //   };
  // }
  
    if (!payload.password) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Password is required');
    }

  const user = await User.create(payload);
  if (!user) {
    throw new AppError(httpStatus.BAD_REQUEST, 'User creation failed');
  }
  return user;
};

const getAllUser = async (query: Record<string, any>) => {
  const userModel = new QueryBuilder(User.find(), query)
    .search(['name', 'email', 'phoneNumber', 'status'])
    .filter()
    .paginate()
    .sort();
  const data: any = await userModel.modelQuery;
  const meta = await userModel.countTotal();
  return {
    data,
    meta,
  };
};

const geUserById = async (id: string) => {
  const result = await User.findById(id);
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }
  return result;
};

const updateUser = async (id: string, payload: Partial<IUser>) => {
  const user = await User.findByIdAndUpdate(id, payload, { new: true });
  if (!user) {
    throw new AppError(httpStatus.BAD_REQUEST, 'User updating failed');
  }

  return user;
};

const deleteUser = async (id: string) => {
  const user = await User.findByIdAndUpdate(
    id,
    { isDeleted: true },
    { new: true },
  );

  if (!user) {
    throw new AppError(httpStatus.BAD_REQUEST, 'user deleting failed');
  }

  return user;
};

export const userService = {
  createUser,
  getAllUser,
  geUserById,
  updateUser,
  deleteUser,
};
