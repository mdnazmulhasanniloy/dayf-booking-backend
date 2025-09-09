import httpStatus from 'http-status';
import { ICarousel } from './carousel.interface';
import Carousel from './carousel.models';
import QueryBuilder from '../../builder/QueryBuilder';
import AppError from '../../error/AppError';
import { deleteFromS3 } from '../../utils/s3';

const createCarousel = async (payload: ICarousel) => {
  const result = await Carousel.create(payload);
  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to create carousel');
  }
  return result;
};

const getAllCarousel = async (query: Record<string, any>) => {
  const carouselModel = new QueryBuilder(Carousel.find(), query)
    .search(['title'])
    .filter()
    .paginate()
    .sort()
    .fields();

  const data = await carouselModel.modelQuery;
  const meta = await carouselModel.countTotal();

  return {
    data,
    meta,
  };
};

const getCarouselById = async (id: string) => {
  const result = await Carousel.findById(id);
  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Carousel not found!');
  }
  return result;
};

const updateCarousel = async (id: string, payload: Partial<ICarousel>) => {
  const result = await Carousel.findByIdAndUpdate(id, payload, { new: true });
  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to update Carousel');
  }
  return result;
};

const deleteCarousel = async (id: string) => {
  const carouselGet = Carousel.findById(id);
  if (carouselGet?.image) {
    const url = new URL(carouselGet?.image as string);
    const route = url.pathname;
    await deleteFromS3(route);
  }

  const result = await Carousel.findByIdAndDelete(id);
  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to delete carousel');
  }
  return result;
};

export const carouselService = {
  createCarousel,
  getAllCarousel,
  getCarouselById,
  updateCarousel,
  deleteCarousel,
};
