import { model, Schema, Types } from 'mongoose';
import { IApartmentDraft } from './apartmentDraft.interface';
import generateCryptoString from '../../utils/generateCryptoString';
import { APARTMENT_STATUS } from '../apartment/apartment.constants';

const LocationSchema = new Schema({
  type: { type: String, required: false },
  coordinates: { type: [Number], required: false },
});

const ImageSchema = new Schema({
  url: { type: String, required: false },
  key: { type: String, required: false },
});

const draftSchema = new Schema<IApartmentDraft>(
  {
    // Legacy drafts are read and migrated on their next edit.
    data: { type: Schema.Types.Mixed },
    id: {
      type: String,
      unique: true,
      default: () => generateCryptoString(10),
    },

    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    images: {
      type: [ImageSchema],
      default: [],
    },

    price: {
      type: Number,
      required: false,
      min: 0,
    },

    name: {
      type: String,
      required: false,
      trim: true,
    },

    banner: {
      type: String,
    },

    shortDescription: {
      type: String,
      required: false,
      trim: true,
    },

    description: {
      type: String,
      required: false,
      trim: true,
    },

    maxGuests: {
      type: Number,
      required: false,
      default: 1,
    },

    totalBadRooms: {
      type: Number,
      required: false,
      min: 0,
    },

    bads: {
      type: Number,
      required: false,
      min: 0,
    },

    roomSize: {
      type: String,
      required: false,
    },

    address: {
      type: String,
      required: false,
      trim: true,
    },

    facilities: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Facilities',
        required: false,
      },
    ],
    othersFacilities: [
      {
        type: String,
        required: false,
      },
    ],
    location: {
      type: LocationSchema,
      required: false,
    },
    municipality: {
      type: String,
      required: false,
      trim: true,
    },

    landmark: {
      type: String,
      trim: true,
      default: '',
    },

    bathrooms: {
      type: Number,
      required: false,
      min: 0,
    },
    checkInTime: {
      type: String,
      required: false,
    },

    checkOutTime: {
      type: String,
      required: false,
    },

    minimumNights: {
      type: Number,
      required: false,
      min: 1,
    },

    houseRules: {
      type: String,
      default: '',
    },

    cancellationPolicy: {
      type: String,
      default: '',
    },

    status: {
      type: String,
      enum: Object.values(APARTMENT_STATUS),
      default: APARTMENT_STATUS.pending,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },

    avgRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    boostedUntil: {
      type: Date,
      default: null,
    },

    boostReason: {
      type: String,
      default: null,
    },

    reviews: [
      {
        type: Types.ObjectId,
        ref: 'Reviews',
        required: false,
      },
    ],

    // New Fields
    propertyType: {
      type: String,
      required: false,
      trim: true,
    },

    wilaya: {
      type: String,
      required: false,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

draftSchema.index({ author: 1, updatedAt: -1 });
export const ApartmentDraft = model<IApartmentDraft>(
  'ApartmentDraft',
  draftSchema,
);
