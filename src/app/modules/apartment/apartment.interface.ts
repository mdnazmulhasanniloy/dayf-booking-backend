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

  // profile: string;
  // coverImage: string;
  // coverColor: string;
  //
  // guests: { adult: number; children: number; infants: number };
  // totalCapacity: number;

  // roomSize: number;
  // isAvailable: boolean;

  // facilities: IFacilities;
  // othersFacilities: string[];
  // policy: string;
}

export type IApartmentModules = Model<IApartment, Record<string, unknown>>;
