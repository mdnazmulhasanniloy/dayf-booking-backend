import { model, Schema } from 'mongoose';
import { IFacilities, IFacilitiesModules } from './facilities.interface';

const facilitiesSchema = new Schema<IFacilities>(
  {
    title: { type: String, require: true },
    icon: { type: String, require: true },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  },
);

const Facilities = model<IFacilities, IFacilitiesModules>(
  'Facilities',
  facilitiesSchema,
);
export default Facilities;
