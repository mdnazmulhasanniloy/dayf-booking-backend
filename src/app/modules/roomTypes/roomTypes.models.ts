
import { model, Schema } from 'mongoose';
import { IRoomTypes, IRoomTypesModules } from './roomTypes.interface';
import { IImage } from '../property/property.interface';


const ImageSchema = new Schema<IImage>({
  key: { type: String, required: true },
  url: { type: String, required: true },
});

const roomTypesSchema = new Schema<IRoomTypes>(
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
     category: { type: String, required: true },
     pricePerNight: { type: Number, required: true },
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
     roomSpace: { type: Number, required: true },
     bedDetails: { type: String, required: true },
     facilities: [
       { type: Schema.Types.ObjectId, ref: 'Facilities', required: true },
     ],
     otherFacilities: [{ type: String, required: false, default: null }],
     customerChoices: { type: String, required: false, default: null },
     descriptions: { type: String, required: false, default: null },
     shortDescriptions: { type: String, required: false, default: null },
     policy: { type: String, required: false, default: null },
     isDeleted: { type: Boolean, default: false },
   },
   {
     timestamps: true,
   },
);

 

const RoomTypes = model<IRoomTypes, IRoomTypesModules>(
  'RoomTypes',
  roomTypesSchema
);
export default RoomTypes;