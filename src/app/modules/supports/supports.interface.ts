import { Model } from 'mongoose';

export interface IDocuments {
  key: string;
  url: string;
}
export interface ISupports {
  name: string;
  email: string;
  subject: string;
  descriptions: string;
  documents: IDocuments[];
}

export type ISupportsModules = Model<ISupports, Record<string, unknown>>;
