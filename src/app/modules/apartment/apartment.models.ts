import { model, Schema, Types } from 'mongoose';
import { IApartment, IApartmentModules } from './apartment.interface';
import generateRandomHexColor from '../../utils/generateRandomHexColor';
import generateCryptoString from '../../utils/generateCryptoString';
import { max } from 'moment';

const LocationSchema = new Schema({
  type: { type: String, required: true },
  coordinates: { type: [Number], required: true },
});
const ImageSchema = new Schema({
  url: { type: String, required: true },
  key: { type: String, required: true },
});

const apartmentSchema = new Schema<IApartment>(
  {
    id: {
      type: String,
      unique: true,
      default: () => generateCryptoString(10),
    },
    profile: {
      type: String,
      required: true,
    },
    coverImage: {
      type: String,
    },
    coverColor: {
      type: String,
      default: () => generateRandomHexColor(),
    },
    author: {
      type: Types.ObjectId,
      ref: 'User',
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    images: {
      type: [ImageSchema],
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    roomSize: {
      type: Number,
      required: true,
    },
  
    shortDescription: {
      type: String,
      required: false,
      default: null,
    },
    description: {
      type: String,
      required: false,
      default: null,
    },
    location: {
      type: LocationSchema,
      required: true,
    },
    guests: {
      adult: {
        type: Number,
        required: true,
        max: 10,
        min: 1,
      },
      children: {
        type: Number,
        required: true,
        max: 10,
        min: 2,
      },
      infants: {
        type: Number,
        required: true,
        max: 2,
        min: 0,
      },
    },

    address: {
      type: String,
      default: null,
    },
    facilities: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Facilities',
        required: true,
      },
    ],
    othersFacilities: [
      {
        type: String,
        required: false,
      },
    ],
    policy: {
      type: String,
      required: false,
      default: null,
    },
    avgRating: {
      type: Number,
      default: 0,
    },
    reviews: [
      {
        type: Types.ObjectId,
        ref: 'Reviews',
        required: true,
      },
    ],
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);
 

apartmentSchema.index({ location: '2dsphere' });
const Apartment = model<IApartment, IApartmentModules>(
  'Apartment',
  apartmentSchema,
);
export default Apartment;
