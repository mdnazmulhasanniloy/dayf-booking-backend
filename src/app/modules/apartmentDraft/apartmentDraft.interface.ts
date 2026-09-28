import { Types } from 'mongoose';
import { IApartment } from '../apartment/apartment.interface';
export interface IApartmentDraft extends Partial<Omit<IApartment, 'author'>> {
  author: Types.ObjectId;
  /** Previous storage format, migrated when the draft is edited. */
  data?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}
