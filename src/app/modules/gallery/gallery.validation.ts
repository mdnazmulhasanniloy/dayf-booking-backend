import { z } from 'zod';

const createSchema = z.object({
  body: z.object({
    category: z.enum(['topSection', 'whyChooseSection']),
  }),
});
const updateSchema = z.object({
  body: z
    .object({
      category: z.enum(['topSection', 'whyChooseSection']),
    })
    .deepPartial(),
});

export const galleryValidation = {
  createSchema,
  updateSchema,
};
