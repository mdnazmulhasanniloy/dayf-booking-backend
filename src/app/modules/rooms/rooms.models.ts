import { model, Schema, Types } from 'mongoose';
import { IRooms, IRoomsModules } from './rooms.interface'; 
import generateCryptoString from '../../utils/generateCryptoString';

const roomsSchema = new Schema<IRooms>(
  {
    roomNumber: {
      type: String,
      default: generateCryptoString(5),
    },
    property: {
      type: Types.ObjectId,
      ref: 'Property',
      default: null,
    },
    roomCategory: {
      type: Types.ObjectId,
      ref: 'RoomTypes',
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

const Rooms = model<IRooms, IRoomsModules>('Rooms', roomsSchema);
export default Rooms;
