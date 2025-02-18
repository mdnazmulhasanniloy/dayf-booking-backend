import { model, Schema } from 'mongoose';
import { IRooms, IRoomsModules } from './rooms.interface';
import { IImage } from './../property/property.interface';

const ImageSchema = new Schema<IImage>({
  key: { type: String, required: true },
  url: { type: String, required: true },
});

const roomsSchema = new Schema<IRooms>(
  {
    property: {
      type: Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    images: { type: [ImageSchema], required: true },
    roomType: { type: String, required: true },
    pricePerNight: { type: Number, required: true },
    guestsAllowed: { type: Number, required: true },
    availableRooms: { type: Number, required: true },
    roomSpace: { type: Number, required: true },
    bedDetails: { type: String, required: true },
    facilities: [
      { type: Schema.Types.ObjectId, ref: 'Facilities', required: true },
    ],
    otherFacilities: [{ type: String, required: false, default: null }],
    customerChoices: { type: String, required: false, default: null },
    descriptions: { type: String, required: false, default: null },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  },
);

const Rooms = model<IRooms, IRoomsModules>('Rooms', roomsSchema);
export default Rooms;
