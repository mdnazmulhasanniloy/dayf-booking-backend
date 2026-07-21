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
  completed = 'completed', // guest checked out
  expired = 'expired', // payment timeout
}
