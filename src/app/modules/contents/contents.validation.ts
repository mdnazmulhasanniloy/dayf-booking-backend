import { z } from 'zod';

const createContentsZodSchema = z.object({
  body: z.object({
    createdBy: z.string({ required_error: 'createBy is required' }),
    aboutUs: z.string({ required_error: 'about us is required' }).optional(),
    termsAndConditions: z
      .string({ required_error: 'terms and conditions us is required' })
      .optional(),
    privacyPolicy: z
      .string({ required_error: 'privacy policy us is required' })
      .optional(),
    supports: z
      .string({ required_error: 'supports us is required' })
      .optional(),
    faq: z.string({ required_error: 'supports us is required' }).optional(),
  }),
});
const updateContentsZodSchema = z.object({
  body: z.object({
    createBy: z.string({ required_error: 'createBy is required' }).optional(),
    aboutUs: z.string({ required_error: 'about us is required' }).optional(),
    termsAndConditions: z
      .string({ required_error: 'terms and conditions us is required' })
      .optional(),
    privacyPolicy: z
      .string({ required_error: 'privacy policy us is required' })
      .optional(),
    supports: z
      .string({ required_error: 'supports us is required' })
      .optional(),
    faq: z.string({ required_error: 'supports us is required' }).optional(),
  }),
});

const supportMailSchema = z.object({
  body:z.object({
    name: z
      .string({
        required_error: 'Name is required',
        invalid_type_error: 'Name must be a string',
      })
      .min(2, 'Name must be at least 2 characters'),
  
    subject: z
      .string({
        required_error: 'Subject is required',
        invalid_type_error: 'Subject must be a string',
      })
      .min(2, 'Subject must be at least 2 characters'),
  
    email: z
      .string({
        required_error: 'Email is required',
        invalid_type_error: 'Email must be a string',
      })
      .email('Invalid email address'),
  
    description: z
      .string({
        required_error: 'Message is required',
        invalid_type_error: 'Message must be a string',
      })
      .min(10, 'Message must be at least 10 characters'),
  })
})

export const contentsValidator = {
  createContentsZodSchema,
  updateContentsZodSchema,supportMailSchema
};
