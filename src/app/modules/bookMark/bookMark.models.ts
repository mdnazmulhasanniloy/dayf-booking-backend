
import { model, Schema, Types } from 'mongoose';
import { IBookMark, IBookMarkModules, MODEL_TYPE } from './bookMark.interface';

const bookMarkSchema = new Schema<IBookMark>(
  {
   user:{
    type: Schema.Types.ObjectId,
    ref: "User",
    require:true
   },
   modelType:{
    type: String, 
    enum:MODEL_TYPE,
    required:true
   },
   reference:{
    type: Schema.Types.ObjectId,
   refPath:'modelType',
    require:true
   }
  },
  {
    timestamps: true,
  }
);

 

bookMarkSchema.statics.isBookMarkExist = async function (user: string, reference:string) {
  return await BookMark.findOne({ user, reference })
};


const BookMark = model<IBookMark, IBookMarkModules>(
  'BookMark',
  bookMarkSchema
);
export default BookMark;