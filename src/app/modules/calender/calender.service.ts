import httpStatus from 'http-status';
import { ICalender } from './calender.interface';
import Calender from './calender.models';
import QueryBuilder from '../../builder/QueryBuilder';
import AppError from '../../error/AppError';
import moment from 'moment';

const createCalender = async (payload: ICalender) => {
  payload['expireAt'] = null;
  const result = await Calender.create(payload);
  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to create calender');
  }
  return result;
};

const getAllCalender = async (query: Record<string, any>) => {
  query['isDeleted'] = false;
  const calenderModel = new QueryBuilder(Calender.find(), query)
    .search([''])
    .filter()
    .paginate()
    .sort()
    .fields();

  const data = await calenderModel.modelQuery;
  const meta = await calenderModel.countTotal();

  return {
    data,
    meta,
  };
};

const getCalenderById = async (id: string) => {
  const result = await Calender.findById(id);
  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Calender not found!');
  }
  return result;
};

const updateCalender = async (id: string, payload: Partial<ICalender>) => {
  const result = await Calender.findByIdAndUpdate(id, payload, { new: true });
  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to update Calender');
  }
  return result;
};

const deleteCalender = async (id: string) => {
  const result = await Calender.findByIdAndUpdate(
    id,
    { isDeleted: true },
    { new: true },
  );
  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to delete calender');
  }
  return result;
};

const getAvailability = async (
  reference: string,
  date?: string, // 1-12
) => {
  const start = moment(date ?? moment()).startOf('month');
  const end = moment(date ?? moment()).endOf('month');

  const blocks = await Calender.find({
    reference,
    date: { $gte: start.toDate(), $lte: end.toDate() },
  });

  const blockMap = new Map(
    blocks.map(b => [moment(b.date).format('YYYY-MM-DD'), b]),
  );

  const days = [];
  const cursor = start.clone();
  while (cursor.isSameOrBefore(end)) {
    const key = cursor.format('YYYY-MM-DD');
    const block = blockMap.get(key);
    days.push({
      date: key,
      status: block ? 'RED' : 'GREEN',
      type: block?.type || null,
      blockId: block?._id || null,
    });
    cursor.add(1, 'day');
  }

  return days;
};

export const calenderService = {
  createCalender,
  getAllCalender,
  getCalenderById,
  updateCalender,
  deleteCalender,
  getAvailability,
};
