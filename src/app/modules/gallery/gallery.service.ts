import httpStatus from 'http-status';
import { IGallery } from './gallery.interface';
import Gallery from './gallery.models';
import QueryBuilder from '../../builder/QueryBuilder';
import AppError from '../../error/AppError';
import { deleteFromS3 } from '../../utils/s3';

const createGallery = async (payload: IGallery) => {
  const result = await Gallery.create(payload);
  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to create gallery');
  }
  return result;
};

const getAllGallery = async (query: Record<string, any>) => {
  const galleryModel = new QueryBuilder(Gallery.find({}), query)
    .search(['category'])
    .filter()
    .paginate()
    .sort()
    .fields();

  const data = await galleryModel.modelQuery;
  const meta = await galleryModel.countTotal();

  return {
    data,
    meta,
  };
};

const getGalleryById = async (id: string) => {
  const result = await Gallery.findById(id);
  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Gallery not found!');
  }
  return result;
};

const updateGallery = async (id: string, payload: Partial<IGallery>) => {
  const result = await Gallery.findByIdAndUpdate(id, payload, { new: true });
  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to update Gallery');
  }
  return result;
};

const deleteGallery = async (id: string) => {
  const gallery = Gallery.findById(id);
  if (gallery?.image) {
    const url = new URL(gallery.image as string);
    const route = url.pathname;
    await deleteFromS3(route);
  }

  const result = await Gallery.findByIdAndDelete(id);
  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to delete gallery');
  }
  return result;
};

export const galleryService = {
  createGallery,
  getAllGallery,
  getGalleryById,
  updateGallery,
  deleteGallery,
};
