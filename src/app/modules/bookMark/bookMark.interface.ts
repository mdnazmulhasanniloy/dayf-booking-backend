
import { ObjectId } from 'mongoose';
import { Model } from 'mongoose';

export enum MODEL_TYPE {
  apartment = 'Apartment',
  property = 'Property',
}
export interface IBookMark {
    _id:string
    user:ObjectId,
    modelType:string
    reference:ObjectId

}

export interface IBookMarkModules extends Model<IBookMark, Record<string, unknown>>{
 
      isBookMarkExist(user: string, reference:string): Promise<IBookMark>;
}