
import { Model } from 'mongoose';

export interface IFacilities {
    _id?: string;
    title: string;
    icon: string;
    isDeleted: boolean;
}

export type IFacilitiesModules = Model<IFacilities, Record<string, unknown>>;