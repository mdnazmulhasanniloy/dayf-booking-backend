import httpStatus from 'http-status';
import AppError from '../../error/AppError';
import { uploadManyToS3, uploadToS3 } from '../../utils/s3';

const multiple = async (files: any) => {
  let imagesArray: any[] = [];
  let videosArray: any[] = [];

  const { images, videos } = files;

  if (images) {
    const imgsArr: { file: any; path: string; key?: string }[] = [];

    images?.map(async (image: any) => {
      imgsArr.push({
        file: image,
        path: `images/`,
      });
    });

    imagesArray = (await uploadManyToS3(imgsArr)) || [];
  }

  if (videos) {
    const videosArr: { file: any; path: string; key?: string }[] = [];

    videos?.map(async (video: any) => {
      videosArr.push({
        file: video,
        path: `videos/`,
      });
    });

    videosArray = await uploadManyToS3(videosArr);
  }

  return {
    images: imagesArray,
    videos: videosArray,
  };
};

const single = async (file: any) => {
  if (!file) {
    throw new AppError(httpStatus.BAD_REQUEST, 'File is required');
  }
  const result = await uploadToS3({
    file,
    fileName: `images/${Math.floor(100000 + Math.random() * 900000)}`,
  });

  return result;
};

const uploadService = { multiple, single };
export default uploadService;
