import { model, Schema, Types } from 'mongoose';
import { IApartment, IApartmentModules } from './apartment.interface';
import generateCryptoString from '../../utils/generateCryptoString';

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
    author: {
      type: Types.ObjectId,
      ref: 'User',
      required: true,
    },
    images: {
      type: [ImageSchema],
      default: [],
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    banner: {
      type: String,
    },
    shortDescription: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    maxGuests: {
      type: Number,
      required: true,
      default: 1,
    },

    totalBadRooms: {
      type: Number,
      required: true,
      min: 0,
    },

    bads: {
      type: Number,
      required: true,
      min: 0,
    },

    roomSize: {
      type: String,
      required: true,
    },

    address: {
      type: String,
      required: true,
      trim: true,
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
    location: {
      type: LocationSchema,
      required: true,
    },
    municipality: {
      type: String,
      required: true,
      trim: true,
    },

    landmark: {
      type: String,
      trim: true,
      default: '',
    },

    bathrooms: {
      type: Number,
      required: true,
      min: 0,
    },
    checkInTime: {
      type: String,
      required: true,
    },

    checkOutTime: {
      type: String,
      required: true,
    },

    minimumNights: {
      type: Number,
      required: true,
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

    isApproved: {
      type: Boolean,
      default: false,
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

    reviews: [
      {
        type: Types.ObjectId,
        ref: 'Reviews',
        required: true,
      },
    ],

    // New Fields
    propertyType: {
      type: String,
      required: true,
      trim: true,
    },

    wilaya: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

apartmentSchema.index({ location: '2dsphere' });

// Search Indexes
apartmentSchema.index({ author: 1 });
apartmentSchema.index({ isApproved: 1 });
apartmentSchema.index({ isDeleted: 1 });
apartmentSchema.index({ propertyType: 1 });
apartmentSchema.index({ wilaya: 1 });
apartmentSchema.index({ municipality: 1 });

const Apartment = model<IApartment, IApartmentModules>(
  'Apartment',
  apartmentSchema,
);
export default Apartment;
