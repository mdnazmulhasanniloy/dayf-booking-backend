import httpStatus from 'http-status';
import { ISupports } from './supports.interface';
import Supports from './supports.models';
import QueryBuilder from '../../builder/QueryBuilder';
import AppError from '../../error/AppError';
import { uploadManyToS3 } from '../../utils/s3';
import { notificationServices } from '../notification/notification.service';
import { modeType } from '../notification/notification.interface';
import { User } from '../user/user.models';
import { USER_ROLE } from '../user/user.constants';

const createSupports = async (payload: ISupports, files: any) => {
  if (files) {
    const { documents } = files;

    if (documents?.length) {
      const imgsArray: { file: any; path: string; key?: string }[] = [];

      documents?.map(async (document: any) => {
        imgsArray.push({
          file: document,
          path: `documents/support`,
        });
      });

      payload.documents = await uploadManyToS3(imgsArray);
    }
  }

  const result = await Supports.create(payload);
  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to create supports');
  }
  const admin = await User.findOne({ role: USER_ROLE.admin });
  await notificationServices.insertNotificationIntoDb({
    receiver: admin?._id,
    message: `New support message submitted`,
    description: `${payload.name} submit a message. subject:${payload?.subject}`,
    refference: result?._id,
    model_type: modeType.Supports,
  });
  return result;
};

const getAllSupports = async (query: Record<string, any>) => {
  const supportsModel = new QueryBuilder(Supports.find(), query)
    .search(['name', 'email', 'subject'])
    .filter()
    .paginate()
    .sort()
    .fields();

  const data = await supportsModel.modelQuery;
  const meta = await supportsModel.countTotal();

  return {
    data,
    meta,
  };
};

const getSupportsById = async (id: string) => {
  const result = await Supports.findById(id);
  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Supports not found!');
  }
  return result;
};

 

const deleteSupports = async (id: string) => {
  const result = await Supports.findByIdAndDelete(id);
  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to delete supports');
  }
  return result;
};

export const supportsService = {
  createSupports,
  getAllSupports,
  getSupportsById, 
  deleteSupports,
};
