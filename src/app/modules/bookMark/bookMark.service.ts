
import httpStatus from 'http-status';
import { IBookMark, MODEL_TYPE } from './bookMark.interface';
import BookMark from './bookMark.models';
import QueryBuilder from '../../builder/QueryBuilder';
import AppError from '../../error/AppError';
import Apartment from '../apartment/apartment.models';
import Property from '../property/property.models';

const createBookMark = async (payload: IBookMark) => {
  const isExist = await BookMark.isBookMarkExist(payload?.user?.toString(), payload?.reference?.toString())
  if(isExist){
   return await BookMark.findByIdAndDelete(isExist?._id)
  }

  if(payload.modelType === MODEL_TYPE.apartment){
    const apartment = await Apartment.findById(payload?.reference)
    if(!apartment) throw new AppError(httpStatus?.NOT_FOUND, "Apartment is not found!")
  }else{
 const property = await Property.findById(payload?.reference)
    if(!property) throw new AppError(httpStatus?.NOT_FOUND, "Property is not found!")
}
  const result = await BookMark.create(payload);
  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to create bookMark');
  }
  return result;
};

const getAllBookMark = async (query: Record<string, any>) => { 
  const bookMarkModel = new QueryBuilder(BookMark.find().populate([{path:"user", select:"name email profile phoneNumber"},{path:"reference"}]), query)
    .search([""])
    .filter()
    .paginate()
    .sort()
    .fields();

  const data = await bookMarkModel.modelQuery;
  const meta = await bookMarkModel.countTotal();

  return {
    data,
    meta,
  };
};

const getBookMarkById = async (id: string) => {
  const result = await BookMark.findById(id).populate([{path:"user", select:"name email profile phoneNumber"},{path:"reference"}]);
  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST,'BookMark not found!');
  }
  return result;
};

const updateBookMark = async (id: string, payload: Partial<IBookMark>) => {
  const result = await BookMark.findByIdAndUpdate(id, payload, { new: true });
  if (!result) {
   throw new AppError(httpStatus.BAD_REQUEST,'Failed to update BookMark');
  }
  return result;
};

const deleteBookMark = async (id: string) => {
  const result = await BookMark.findByIdAndDelete(
    id );
  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to delete bookMark');
  }
  return result;
};

export const bookMarkService = {
  createBookMark,
  getAllBookMark,
  getBookMarkById,
  updateBookMark,
  deleteBookMark,
};