import { Schema, model } from 'mongoose';
import { IContents, IContentsModel } from './contents.interface';

const contentsSchema = new Schema<IContents>(
  {
    aboutUs: {
      type: String,
      default: null,
    },
    termsAndConditions: {
      type: String,
      default: null,
    },
    privacyPolicy: {
      type: String,
      default: null,
    },
    legalNotice: {
      type: String,
      default: null,
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
      default: null,
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
