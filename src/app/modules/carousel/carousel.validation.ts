import { z } from 'zod';

export const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
});

const create = z.object({
  body: schema,
});
const update = z.object({
  body: schema.deepPartial(),
});

const carouselValidationSchema = {
  create,
  update,
};

export default carouselValidationSchema;
