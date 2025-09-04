import { model, Schema } from 'mongoose';
import { IDocuments, ISupports, ISupportsModules } from './supports.interface';


const documentsSchema = new Schema<IDocuments>({
  key: { type: String, required: true },
  url: { type: String, required: true },
});

const supportsSchema = new Schema<ISupports>(
  {
    name: {
      type: String,
      require: true,
    },
    email: {
      type: String,
      require: true,
    },
    subject: {
      type: String,
      require: true,
    },
    descriptions: {
      type: String,
      require: true,
    },
    documents: { type: [documentsSchema], required: false },
  },
  {
    timestamps: true,
  },
);

const Supports = model<ISupports, ISupportsModules>('Supports', supportsSchema);
export default Supports;
