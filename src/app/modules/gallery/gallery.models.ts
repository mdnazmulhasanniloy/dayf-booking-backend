import { model, Schema } from 'mongoose';
import { IGallery, IGalleryModules } from './gallery.interface';

const gallerySchema = new Schema<IGallery>(
  {
    image: {
      type: String,
      require: true,
    },
    category: {
      type: String,
      enum: ['topSection', 'whyChooseSection'],
      require: true,
    },
  },
  {
    timestamps: true,
  },
);

const Gallery = model<IGallery, IGalleryModules>('Gallery', gallerySchema);
export default Gallery;
