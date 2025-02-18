import { model, Schema } from 'mongoose';
import {
  IImage,
  ILocations,
  IProperty,
  IPropertyModules,
} from './property.interface';
import generateCryptoString from '../../utils/generateCryptoString';

const ImageSchema = new Schema<IImage>({
  key: { type: String, required: true },
  url: { type: String, required: true },
});

const LocationSchema = new Schema<ILocations>({
  type: { type: String, enum: ['Point'], required: true },
  coordinates: { type: [Number], required: true },
});

const propertySchema = new Schema<IProperty>(
  {
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    id: {
      type: String,
      unique: true,
      default: () => {
        return generateCryptoString(10);
      },
    },
    images: { type: [ImageSchema], required: true },
    name: { type: String, required: true },
    length: { type: Number, required: true },
    description: { type: String, required: true },
    address: { type: String, required: true },
    location: { type: LocationSchema, required: true },
    facility: [
      { type: Schema.Types.ObjectId, ref: 'Facilities', required: true },
    ],
    Other: [{ type: String, required: true }],
    avgRating: { type: Number, default: 0 },
    reviews: [{ type: Schema.Types.ObjectId, ref: 'reviews' }],
    rooms: [{ type: Schema.Types.ObjectId, ref: 'Rooms' }],

    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  },
);

propertySchema.index({ location: '2dsphere' });

const Property = model<IProperty, IPropertyModules>('Property', propertySchema);
export default Property;
