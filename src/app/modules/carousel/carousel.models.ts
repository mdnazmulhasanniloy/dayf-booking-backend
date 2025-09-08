import { model, Schema } from 'mongoose';
import { ICarousel, ICarouselModules } from './carousel.interface';

const carouselSchema = new Schema<ICarousel>(
  {
    image: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

const Carousel = model<ICarousel, ICarouselModules>('Carousel', carouselSchema);
export default Carousel;
