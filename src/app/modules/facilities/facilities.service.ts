import httpStatus from 'http-status';
import { IFacilities } from './facilities.interface';
import Facilities from './facilities.models';
import QueryBuilder from '../../builder/QueryBuilder';
import AppError from '../../error/AppError';
import { uploadToS3 } from '../../utils/s3';

const createFacilities = async (payload: IFacilities, file: any) => {
  const isExist: IFacilities | null = await Facilities.findOne({
    title: payload.title,
  });

  if (file) {
    payload.icon = (await uploadToS3({
      file,
      fileName: `images/facilities/${Math.floor(100000 + Math.random() * 900000)}`,
    })) as string;
  }

  if (isExist && isExist.isDeleted) {
    const result = await Facilities.findByIdAndUpdate(isExist?._id, {
      isDeleted: false,
      icon: payload?.icon,
    });
    return result;
  }

  const result = await Facilities.create(payload);
  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to create facilities');
  }
  return result;
};

const getAllFacilities = async (query: Record<string, any>) => {
  query['isDeleted'] = false;
  const facilitiesModel = new QueryBuilder(Facilities.find(), query)
    .search(['title'])
    .filter()
    .paginate()
    .sort()
    .fields();

  const data = await facilitiesModel.modelQuery;
  const meta = await facilitiesModel.countTotal();

  return {
    data,
    meta,
  };
};

const getFacilitiesById = async (id: string) => {
  const result = await Facilities.findById(id);
  if (!result || result?.isDeleted) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Facilities not found!');
  }
  return result;
};

const updateFacilities = async (
  id: string,
  payload: Partial<IFacilities>,
  file: any,
) => {
  const isExist = await Facilities.findById(id);

  if (!isExist) {
    throw new AppError(httpStatus.NOT_FOUND, 'Facilities not found');
  }

  if (file) {
    payload.icon = (await uploadToS3({
      file,
      fileName: `images/facilities/${Math.floor(100000 + Math.random() * 900000)}`,
    })) as string;
  }

  const result = await Facilities.findByIdAndUpdate(id, payload, { new: true });
  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to update Facilities');
  }
  return result;
};

const deleteFacilities = async (id: string) => {
  const result = await Facilities.findByIdAndUpdate(
    id,
    { isDeleted: true },
    { new: true },
  );
  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to delete facilities');
  }
  return result;
};

export const facilitiesService = {
  createFacilities,
  getAllFacilities,
  getFacilitiesById,
  updateFacilities,
  deleteFacilities,
};
