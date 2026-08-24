export enum PAYMENT_STATUS {
  pending = 'pending',
  paid = 'paid',
  failed = 'failed',
  refunded = 'refunded',
}

export enum BOOKING_STATUS {
  pending = 'pending', // payment waiting
  confirmed = 'confirmed', // deposit paid
  cancelled = 'cancelled',
  no_show = 'no_show',
  completed = 'completed', // guest checked out
  expired = 'expired', // payment timeout
}

export const ONLINE_DEPOSIT_RATE = 15;
