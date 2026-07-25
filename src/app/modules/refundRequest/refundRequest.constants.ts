export const REFUND_REQUEST_STATUS = {
  pending: 'pending',
  approved: 'approved',
  rejected: 'rejected',
  refunded: 'refunded',
  notEligible: 'not_eligible',
  blockedReview: 'blocked_review',
} as const;

export const CANCELLATION_TYPE = {
  guest: 'guest_cancellation',
  host: 'host_cancellation',
  noShow: 'no_show',
} as const;

export type TRefundRequestStatus =
  (typeof REFUND_REQUEST_STATUS)[keyof typeof REFUND_REQUEST_STATUS];
