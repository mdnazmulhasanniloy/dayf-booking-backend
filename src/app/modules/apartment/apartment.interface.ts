import { Model, ObjectId } from 'mongoose';
import { IImage, ILocations } from '../property/property.interface';
import { IFacilities } from '../facilities/facilities.interface';
import { IUser } from '../user/user.interface';

export interface IApartment {
  deleteKey: string[];
  id: string;
  author: ObjectId | IUser;
  images: IImage[];
  banner: string;
  price: number;
  name: string;
  shortDescription: string;
  description: string;
  status: 'pending' | 'approved' | 'declined';
  maxGuests: number;
  totalBadRooms: number;
  bads: number;
  roomSize: string;
  address: string;
  location: ILocations;
  facilities: IFacilities;
  othersFacilities: string[];
  //new added fields
  propertyType: string;
  wilaya: string;
  municipality: string;
  landmark: string;
  bathrooms: number;
  checkInTime: string;
  checkOutTime: string;
  minimumNights: number;
  houseRules: string;
  cancellationPolicy: string;
  isApproved: boolean;
  isDeleted: boolean;
  avgRating: number;
  reviews: ObjectId;
}

export type IApartmentModules = Model<IApartment, Record<string, unknown>>;
