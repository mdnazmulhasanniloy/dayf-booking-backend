/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import AppError from '../../error/AppError';
import Contents from './contents.models';
import { IContents } from './contents.interface';
import QueryBuilder from '../../builder/QueryBuilder';
import { deleteManyFromS3, uploadManyToS3 } from '../../utils/s3';
import { UploadedFiles } from '../../interface/common.interface';
import { sendEmail } from '../../utils/mailSender';
import path from 'path';
import fs from 'fs';

// Get all contents
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getAllContents = async (query: { key?: keyof IContents }) => {
  const result = await Contents.findOne({});
  if (query?.key) {
    return result?.[query.key];
  } else {
    return result;
  }
};

// Get content by ID
const getContentsById = async (id: string) => {
  const result = await Contents.findById(id).populate(['createdBy']);
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Oops! Content not found');
  }
  return result;
};

const deleteBanner = async (key: string) => {
  const content = await Contents.findOne({});

  if (!content) {
    throw new AppError(httpStatus.NOT_FOUND, 'Content not found');
  }

  const result = await Contents.findByIdAndUpdate(
    content?._id,
    {
      $pull: { whyChooseUsSectionImage: { key: key } },
    },
    { new: true },
  );

  const newKey: string[] = [];
  newKey.push(`images/whyChooseUsSectionImage/${key}`);

  if (newKey) {
    await deleteManyFromS3(newKey);
  }

  return result;
};
// Update content
const updateContents = async (payload: Partial<IContents>, files: any) => {
  const content = await Contents.find({});

  if (!content.length) {
    throw new AppError(httpStatus.NOT_FOUND, 'Content not found');
  }

  const { whyChooseUsSectionDeleteKey, topSectionDeleteKey, ...updateData } =
    payload;

  const update: any = { ...updateData };

  if (files) {
    const { topSectionImage, whyChooseUsSectionImage } = files as UploadedFiles;

    if (topSectionImage?.length) {
      const imgsArray: { file: any; path: string; key?: string }[] = [];

      topSectionImage.map(b =>
        imgsArray.push({
          file: b,
          path: `images/topSectionImage`,
        }),
      );

      payload.topSectionImage = await uploadManyToS3(imgsArray);
    }
    if (whyChooseUsSectionImage?.length) {
      const imgsArray: { file: any; path: string; key?: string }[] = [];

      whyChooseUsSectionImage.map(b =>
        imgsArray.push({
          file: b,
          path: `images/whyChooseUsSectionImage`,
        }),
      );

      payload.whyChooseUsSectionImage = await uploadManyToS3(imgsArray);
    }
  }

  if (topSectionDeleteKey && topSectionDeleteKey.length > 0) {
    const newKey: string[] = [];
    topSectionDeleteKey.map((key: any) =>
      newKey.push(`images/topSectionImage/${key}`),
    );
    if (newKey?.length > 0) {
      await deleteManyFromS3(newKey);
    }

    await Contents.findByIdAndUpdate(content[0]._id, {
      $pull: { topSectionImage: { key: { $in: topSectionDeleteKey } } },
    });
  }

  if (whyChooseUsSectionDeleteKey && whyChooseUsSectionDeleteKey.length > 0) {
    const newKey: string[] = [];
    whyChooseUsSectionDeleteKey.map((key: any) =>
      newKey.push(`images/whyChooseUsSectionImage/${key}`),
    );
    if (newKey?.length > 0) {
      await deleteManyFromS3(newKey);
    }

    await Contents.findByIdAndUpdate(content[0]._id, {
      $pull: {
        whyChooseUsSectionImage: { key: { $in: whyChooseUsSectionDeleteKey } },
      },
    });
  }

  if (payload?.topSectionImage && payload.topSectionImage.length > 0) {
    await Contents.findByIdAndUpdate(content[0]._id, {
      $push: { topSectionImage: { $each: payload.topSectionImage } },
    });
  }

  if (
    payload?.whyChooseUsSectionImage &&
    payload.whyChooseUsSectionImage.length > 0
  ) {
    await Contents.findByIdAndUpdate(content[0]._id, {
      $push: {
        whyChooseUsSectionImage: { $each: payload.whyChooseUsSectionImage },
      },
    });
  }

  const result = await Contents.findByIdAndUpdate(content[0]._id, update, {
    new: true,
  });

  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Content update failed');
  }

  return result;
};
// Delete content
const deleteContents = async (id: string) => {
  const result = await Contents.findByIdAndUpdate(
    id,
    {
      $set: {
        isDeleted: true,
      },
    },
    { new: true },
  );

  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Content deletion failed');
  }

  return result;
};

const supportMessage = async (payload: any) => {
  const otpEmailPath = path.join(
    __dirname,
    '../../../../public/view/supportMail.html',
  );

  await sendEmail(
    'mdnazmulhasanniloy323@gmail.com',
    payload?.subject ?? 'Support Messages',
    fs
      .readFileSync(otpEmailPath, 'utf8')
      .replace('{{name}}', payload.name)
      .replace('{{subject}}', payload?.subject)
      .replace('{{email}}', payload?.email)
      .replace('{{description}}', payload?.description),
  );
  return;
};

export const contentsService = {
  getAllContents,
  getContentsById,
  updateContents,
  deleteContents,
  deleteBanner,
  supportMessage,
};
