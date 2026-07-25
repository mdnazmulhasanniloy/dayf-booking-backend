import { z } from 'zod';
import { REFUND_REQUEST_STATUS } from './refundRequest.constants';

const createRefundRequest = z.object({
  body: z.object({
    reason: z.string().trim().min(5).max(1000),
  }),
});

const updateRefundRequest = z.object({
  body: z
    .object({
      status: z.enum([
        REFUND_REQUEST_STATUS.approved,
        REFUND_REQUEST_STATUS.rejected,
        REFUND_REQUEST_STATUS.refunded,
      ]),
      adminNote: z.string().trim().max(1000).optional(),
      manualRefundReference: z.string().trim().max(200).optional(),
    })
    .superRefine((payload, ctx) => {
      if (
        payload.status === REFUND_REQUEST_STATUS.refunded &&
        !payload.manualRefundReference
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['manualRefundReference'],
          message: 'Manual refund reference is required',
        });
      }
    }),
});

const updateCancellationPolicy = z.object({
  body: z
    .object({
      depositRate: z.number().min(0).max(100).optional(),
      freeCancellationDays: z.number().min(0).optional(),
      refundProcessingHours: z.number().int().min(1).optional(),
      creditDelayMinBusinessDays: z.number().int().min(0).optional(),
      creditDelayMaxBusinessDays: z.number().int().min(0).optional(),
      listingBoostDays: z.number().int().min(0).optional(),
      noShowReportWindowHours: z.number().int().min(1).optional(),
      hostSuspensionDays: z.number().int().min(1).optional(),
      policyText: z.string().trim().min(20).max(5000).optional(),
    })
    .refine(payload => Object.keys(payload).length > 0, {
      message: 'At least one policy field is required',
    }),
});

export const refundRequestValidation = {
  createRefundRequest,
  updateRefundRequest,
  updateCancellationPolicy,
};
