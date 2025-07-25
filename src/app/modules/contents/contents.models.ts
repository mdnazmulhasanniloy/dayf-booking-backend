import { Schema, model } from 'mongoose';
import { IContents, IContentsModel } from './contents.interface';

const contentsSchema = new Schema<IContents>(
  {
    aboutUs: {
      type: String,
    },
    termsAndConditions: {
      type: String,
    },
    privacyPolicy: {
      type: String,
    },
    topSectionImage: [
      {
        key: {
          type: String,
          required: true,
        },
        url: { type: String, required: true },
      },
    ],
    whyChooseUsSectionImage: [
      {
        key: {
          type: String,
          required: true,
        },
        url: { type: String, required: true },
      },
    ],
    supports: {
      type: String,
    },
    faq: {
      type: String,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  },
);

// filter out deleted documents

const Contents = model<IContents, IContentsModel>('Contents', contentsSchema);

export default Contents;
