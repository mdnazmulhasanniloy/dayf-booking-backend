import { Model, ObjectId } from 'mongoose';

export interface IContents {
  topSectionDeleteKey?: string[];
  whyChooseUsSectionDeleteKey?: string[];
  _id?: string;
  createdBy: ObjectId;
  aboutUs?: string;
  termsAndConditions?: string;
  topSectionImage: { key: string; url: string }[];
  whyChooseUsSectionImage: { key: string; url: string }[];
  privacyPolicy?: string;
  supports?: string;
  faq?: string;
  isDeleted?: boolean;
}

export type IContentsModel = Model<IContents, Record<string, unknown>>;
