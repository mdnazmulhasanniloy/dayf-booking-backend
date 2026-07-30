import httpStatus from 'http-status';
import moment from 'moment';
import { startSession, Types } from 'mongoose';
import AppError from '../../error/AppError';
import { notificationQueue, sendMailQueue } from '../../redis';
import Calender from '../calender/calender.models';
import Bookings from '../bookings/bookings.models';
import { BOOKING_STATUS, PAYMENT_STATUS } from '../bookings/bookings.constants';
import Payments from '../payments/payments.models';
import { modeType } from '../notification/notification.interface';
import { User } from '../user/user.models';
import { USER_ROLE } from '../user/user.constants';
import Apartment from '../apartment/apartment.models';
import CancellationPolicy, {
  ICancellationPolicy,
} from './cancellationPolicy.models';
import RefundRequest from './refundRequest.models';
import {
  CANCELLATION_TYPE,
  REFUND_REQUEST_STATUS,
} from './refundRequest.constants';
import { sendSmsSafely } from '../../utils/smsSender';

const DEFAULT_POLICY: ICancellationPolicy = {
  name: 'DAYF Standard Policy',
  isActive: true,
  depositRate: 15,
  freeCancellationDays: 7,
  refundProcessingHours: 48,
  creditDelayMinBusinessDays: 3,
  creditDelayMaxBusinessDays: 7,
  listingBoostDays: 7,
  noShowReportWindowHours: 2,
  hostSuspensionDays: 7,
  policyText:
    'The deposit paid at booking represents 15% of the total stay amount and is non-refundable in cases of guest cancellation within 7 days of check-in or no-show. Cancellations made more than 7 days before check-in are eligible for a full refund, processed within 48 hours and credited within 3 to 7 business days.',
};

const getActivePolicy = async () => {
  const policy = await CancellationPolicy.findOneAndUpdate(
    { isActive: true },
    { $setOnInsert: DEFAULT_POLICY },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  if (policy.listingBoostDays === undefined) {
    policy.listingBoostDays = DEFAULT_POLICY.listingBoostDays;
  }
  if (policy.noShowReportWindowHours === undefined) {
    policy.noShowReportWindowHours = DEFAULT_POLICY.noShowReportWindowHours;
  }
  if (policy.hostSuspensionDays === undefined) {
    policy.hostSuspensionDays = DEFAULT_POLICY.hostSuspensionDays;
  }
  if (policy.isModified()) await policy.save();
  return policy;
};

const updateActivePolicy = async (payload: Partial<ICancellationPolicy>) => {
  const current = await getActivePolicy();
  Object.assign(current, payload, { isActive: true });
  if (
    current.creditDelayMaxBusinessDays <
    current.creditDelayMinBusinessDays
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Maximum credit delay cannot be less than minimum credit delay',
    );
  }
  return current.save();
};

const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const emailLayout = (title: string, body: string) => `
  <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#222">
    <div style="padding:24px 0;border-bottom:1px solid #eee">
      <h2 style="margin:0;color:#00115a">DAYF BOOKING</h2>
    </div>
    <div style="padding:28px 0">
      <h3 style="color:#00115a">${escapeHtml(title)}</h3>
      ${body}
    </div>
    <p style="font-size:12px;color:#888;border-top:1px solid #eee;padding-top:16px">
      This is an automated notification from DAYF BOOKING.
    </p>
  </div>
`;

const queueNotification = (
  receiver: unknown,
  message: string,
  description: string,
  reference: unknown,
) =>
  notificationQueue.add('new_notification', {
    receiver,
    message,
    description,
    refference: reference,
    model_type: modeType.RefundRequests,
  });

const queueEmail = (email: string | undefined, subject: string, html: string) => {
  if (!email) return Promise.resolve();
  return sendMailQueue.add('new_mail', { email, subject, html });
};

const emitCancellationUpdates = (booking: any, request: any) => {
  //@ts-ignore
  const io = global.socketio;
  if (!io) return;
  io.emit('booking.updated', {
    bookingId: booking._id,
    status: booking.status,
    refundRequestId: request._id,
  });
  io.emit('calendar.updated', {
    reference: (booking.reference as any)?._id ?? booking.reference,
    bookingId: booking._id,
  });
  io.emit('refund-request.updated', request);
};

const getScheduledCheckIn = (booking: any) => {
  const date = moment.utc(booking.startDate).format('YYYY-MM-DD');
  const rawTime = String((booking.reference as any)?.checkInTime ?? '14:00');
  const matched = rawTime.match(/(\d{1,2}):(\d{2})/);
  const time = matched
    ? `${matched[1].padStart(2, '0')}:${matched[2]}`
    : '14:00';
  return moment.parseZone(`${date}T${time}:00+01:00`);
};

const createCancellationRequest = async (
  bookingId: string,
  guestId: string,
  reason: string,
) => {
  const policy = await getActivePolicy();
  const booking = await Bookings.findById(bookingId).populate([
    { path: 'user', select: 'name email phoneNumber' },
    { path: 'author', select: 'name email phoneNumber' },
    { path: 'reference', select: 'name' },
  ]);

  if (!booking || booking.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'Booking not found');
  }
  const bookingGuestId = (booking.user as any)?._id ?? booking.user;
  if (bookingGuestId.toString() !== guestId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You can only cancel your own booking',
    );
  }
  if (
    booking.status !== BOOKING_STATUS.confirmed ||
    booking.paymentStatus !== PAYMENT_STATUS.paid
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Only a confirmed and paid booking can be cancelled',
    );
  }
  if (moment().isSameOrAfter(moment(booking.startDate))) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Guest cancellation is not available after check-in time',
    );
  }
  if (await RefundRequest.exists({ booking: booking._id })) {
    throw new AppError(
      httpStatus.CONFLICT,
      'A cancellation request already exists for this booking',
    );
  }

  const payment = await Payments.findOne({
    bookings: booking._id,
    status: PAYMENT_STATUS.paid,
  });
  if (!payment) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Paid transaction was not found for this booking',
    );
  }

  const bookingPolicy = booking.cancellationPolicySnapshot ?? policy;
  const daysBeforeCheckIn = moment(booking.startDate).diff(moment(), 'days', true);
  const isEligible =
    daysBeforeCheckIn > bookingPolicy.freeCancellationDays;
  const session = await startSession();
  let refundRequest: any;

  try {
    await session.withTransaction(async () => {
      [refundRequest] = await RefundRequest.create(
        [
          {
            booking: booking._id,
            payment: payment._id,
            guest: bookingGuestId,
            host: (booking.author as any)?._id ?? booking.author,
            reference: (booking.reference as any)?._id ?? booking.reference,
            requestedBy: new Types.ObjectId(guestId),
            reason,
            daysBeforeCheckIn: Number(daysBeforeCheckIn.toFixed(2)),
            isEligible,
            refundAmount: isEligible ? booking.depositAmount : 0,
            currency: payment.currency,
            status: isEligible
              ? REFUND_REQUEST_STATUS.pending
              : REFUND_REQUEST_STATUS.notEligible,
            cancellationType: CANCELLATION_TYPE.guest,
            suspicious: false,
            boostEligible: true,
            policySnapshot: {
              depositRate: bookingPolicy.depositRate,
              freeCancellationDays: bookingPolicy.freeCancellationDays,
              refundProcessingHours: bookingPolicy.refundProcessingHours,
              creditDelayMinBusinessDays:
                bookingPolicy.creditDelayMinBusinessDays,
              creditDelayMaxBusinessDays:
                bookingPolicy.creditDelayMaxBusinessDays,
              listingBoostDays:
                bookingPolicy.listingBoostDays ?? policy.listingBoostDays,
              noShowReportWindowHours:
                bookingPolicy.noShowReportWindowHours ??
                policy.noShowReportWindowHours,
              hostSuspensionDays:
                bookingPolicy.hostSuspensionDays ?? policy.hostSuspensionDays,
              policyText: bookingPolicy.policyText,
            },
            history: [
              {
                action: 'cancellation_requested',
                actor: new Types.ObjectId(guestId),
                note: reason,
                at: new Date(),
              },
            ],
          },
        ],
        { session },
      );

      await Bookings.updateOne(
        { _id: booking._id, status: BOOKING_STATUS.confirmed },
        {
          $set: {
            status: BOOKING_STATUS.cancelled,
            cancelReason: reason,
          },
        },
        { session },
      );
      await Calender.deleteMany({ bookingId: booking._id }, { session });
      await Apartment.updateOne(
        { _id: (booking.reference as any)?._id ?? booking.reference },
        {
          $set: {
            boostedUntil: moment()
              .add(
                bookingPolicy.listingBoostDays ?? policy.listingBoostDays,
                'days',
              )
              .toDate(),
            boostReason: 'guest_cancellation',
          },
        },
        { session },
      );
    });
  } finally {
    await session.endSession();
  }

  const guest = booking.user as any;
  const host = booking.author as any;
  const apartment = booking.reference as any;
  const eligibilityMessage = isEligible
    ? `Your ${booking.depositAmount} ${payment.currency ?? ''} deposit is eligible for manual refund review.`
    : `Under the cancellation policy, cancellations within ${bookingPolicy.freeCancellationDays} days of check-in are not refundable.`;

  await Promise.all([
    queueNotification(
      bookingGuestId,
      'Cancellation request received',
      eligibilityMessage,
      refundRequest._id,
    ),
    queueNotification(
      host?._id ?? booking.author,
      'Booking cancelled by guest',
      `Booking ${booking.bookingCode} has been cancelled. Its calendar dates are available and the listing is boosted for ${bookingPolicy.listingBoostDays ?? policy.listingBoostDays} days.`,
      refundRequest._id,
    ),
    queueEmail(
      guest?.email,
      'Your DAYF Booking Cancellation Request',
      emailLayout(
        'Cancellation request received',
        `<p>Hi ${escapeHtml(guest?.name)},</p>
         <p>Booking <strong>${escapeHtml(booking.bookingCode)}</strong> for
         <strong>${escapeHtml(apartment?.name)}</strong> has been cancelled.</p>
         <p>${escapeHtml(eligibilityMessage)}</p>
         <p>Request status: <strong>${escapeHtml(refundRequest.status)}</strong></p>`,
      ),
    ),
    sendSmsSafely(
      guest?.phoneNumber,
      `DAYF: Booking ${booking.bookingCode} has been cancelled. ${eligibilityMessage}`,
    ),
    sendSmsSafely(
      host?.phoneNumber,
      `DAYF: Booking ${booking.bookingCode} was cancelled by the guest.`,
    ),
    queueEmail(
      host?.email,
      'A Guest Cancelled a DAYF Booking',
      emailLayout(
        'Booking cancelled',
        `<p>Booking <strong>${escapeHtml(booking.bookingCode)}</strong> was cancelled by the guest.</p>
         <p>The reserved calendar dates have been released automatically.</p>`,
      ),
    ),
  ]);

  const admins = await User.find({
    role: {
      $in: [USER_ROLE.admin, USER_ROLE.sub_admin, USER_ROLE.super_admin],
    },
    isDeleted: false,
  }).select('_id email name');

  await Promise.all(
    admins.flatMap(admin => [
      queueNotification(
        admin._id,
        'New cancellation and refund request',
        `Booking ${booking.bookingCode}: ${eligibilityMessage}`,
        refundRequest._id,
      ),
      queueEmail(
        admin.email,
        'New DAYF Cancellation and Refund Request',
        emailLayout(
          'Refund review required',
          `<p>Booking: <strong>${escapeHtml(booking.bookingCode)}</strong></p>
           <p>Guest: ${escapeHtml(guest?.name)}</p>
           <p>${escapeHtml(eligibilityMessage)}</p>`,
        ),
      ),
    ]),
  );

  emitCancellationUpdates(
    { ...booking.toObject(), status: BOOKING_STATUS.cancelled },
    refundRequest,
  );

  return RefundRequest.findById(refundRequest._id).populate([
    { path: 'booking', select: 'bookingCode startDate endDate status' },
    { path: 'guest', select: 'name email' },
    { path: 'host', select: 'name email' },
  ]);
};

const createHostCancellationAction = async (
  bookingId: string,
  hostId: string,
  reason: string,
  action: 'host_cancellation' | 'no_show',
) => {
  const policy = await getActivePolicy();
  const booking = await Bookings.findById(bookingId).populate([
    { path: 'user', select: 'name email phoneNumber' },
    { path: 'author', select: 'name email phoneNumber' },
    { path: 'reference', select: 'name checkInTime' },
  ]);
  if (!booking || booking.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'Booking not found');
  }
  const bookingHostId = (booking.author as any)?._id ?? booking.author;
  if (bookingHostId.toString() !== hostId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You can only manage bookings for your own property',
    );
  }
  if (
    booking.status !== BOOKING_STATUS.confirmed ||
    booking.paymentStatus !== PAYMENT_STATUS.paid
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Only a confirmed and paid booking can be cancelled or reported',
    );
  }
  if (await RefundRequest.exists({ booking: booking._id })) {
    throw new AppError(
      httpStatus.CONFLICT,
      'A cancellation action already exists for this booking',
    );
  }
  const payment = await Payments.findOne({
    bookings: booking._id,
    status: PAYMENT_STATUS.paid,
  });
  if (!payment) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Paid transaction not found');
  }

  const bookingPolicy = booking.cancellationPolicySnapshot ?? policy;
  const scheduledCheckIn = getScheduledCheckIn(booking);
  const hoursAfterCheckIn = moment().diff(scheduledCheckIn, 'hours', true);
  const isNoShow = action === CANCELLATION_TYPE.noShow;
  if (isNoShow && hoursAfterCheckIn < 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'No-show can only be reported after the scheduled check-in time',
    );
  }
  const noShowWindow =
    bookingPolicy.noShowReportWindowHours ??
    policy.noShowReportWindowHours;
  const boostEligible =
    isNoShow && hoursAfterCheckIn >= 0 && hoursAfterCheckIn <= noShowWindow;
  const suspicious = !isNoShow && hoursAfterCheckIn >= 0;
  const isEligible = !isNoShow;
  const status = isNoShow
    ? REFUND_REQUEST_STATUS.notEligible
    : suspicious
      ? REFUND_REQUEST_STATUS.blockedReview
      : REFUND_REQUEST_STATUS.pending;
  const session = await startSession();
  let request: any;

  try {
    await session.withTransaction(async () => {
      [request] = await RefundRequest.create(
        [
          {
            booking: booking._id,
            payment: payment._id,
            guest: (booking.user as any)?._id ?? booking.user,
            host: bookingHostId,
            reference: (booking.reference as any)?._id ?? booking.reference,
            requestedBy: new Types.ObjectId(hostId),
            reason,
            daysBeforeCheckIn: Number(
              moment(booking.startDate).diff(moment(), 'days', true).toFixed(2),
            ),
            isEligible,
            refundAmount: isEligible ? booking.depositAmount : 0,
            currency: payment.currency,
            status,
            cancellationType: action,
            suspicious,
            boostEligible,
            policySnapshot: {
              depositRate: bookingPolicy.depositRate,
              freeCancellationDays: bookingPolicy.freeCancellationDays,
              refundProcessingHours: bookingPolicy.refundProcessingHours,
              creditDelayMinBusinessDays:
                bookingPolicy.creditDelayMinBusinessDays,
              creditDelayMaxBusinessDays:
                bookingPolicy.creditDelayMaxBusinessDays,
              listingBoostDays:
                bookingPolicy.listingBoostDays ?? policy.listingBoostDays,
              noShowReportWindowHours: noShowWindow,
              hostSuspensionDays:
                bookingPolicy.hostSuspensionDays ?? policy.hostSuspensionDays,
              policyText: bookingPolicy.policyText,
            },
            history: [
              {
                action,
                actor: new Types.ObjectId(hostId),
                note: reason,
                at: new Date(),
              },
            ],
          },
        ],
        { session },
      );

      await Bookings.updateOne(
        { _id: booking._id, status: BOOKING_STATUS.confirmed },
        {
          $set: {
            status: isNoShow
              ? BOOKING_STATUS.no_show
              : BOOKING_STATUS.cancelled,
            cancelReason: reason,
          },
        },
        { session },
      );
      await Calender.deleteMany({ bookingId: booking._id }, { session });

      if (!isNoShow) {
        const suspensionDays =
          bookingPolicy.hostSuspensionDays ?? policy.hostSuspensionDays;
        await User.updateOne(
          { _id: bookingHostId },
          {
            $set: {
              status: 'suspended',
              suspendedUntil: moment().add(suspensionDays, 'days').toDate(),
              suspensionReason: 'host_cancellation_after_confirmation',
            },
            $push: {
              publicCancellationNotes: {
                booking: booking._id,
                note: `Host cancelled confirmed booking ${booking.bookingCode}.`,
                createdAt: new Date(),
              },
            },
          },
          { session },
        );
      }

      if (boostEligible) {
        await Apartment.updateOne(
          { _id: (booking.reference as any)?._id ?? booking.reference },
          {
            $set: {
              boostedUntil: moment()
                .add(
                  bookingPolicy.listingBoostDays ?? policy.listingBoostDays,
                  'days',
                )
                .toDate(),
              boostReason: 'guest_no_show',
            },
          },
          { session },
        );
      }
    });
  } finally {
    await session.endSession();
  }

  const guest = booking.user as any;
  const host = booking.author as any;
  const actionMessage = isNoShow
    ? boostEligible
      ? `No-show recorded within the ${noShowWindow}-hour window. The listing boost is active.`
      : `No-show recorded after the ${noShowWindow}-hour window. The listing is not eligible for a boost.`
    : suspicious
      ? 'Host cancellation was reported after check-in. Refund is blocked until admin validation.'
      : 'Host cancellation recorded. The guest deposit requires a full manual refund.';

  const admins = await User.find({
    role: {
      $in: [USER_ROLE.admin, USER_ROLE.sub_admin, USER_ROLE.super_admin],
    },
    isDeleted: false,
  }).select('_id email');
  await Promise.all([
    queueNotification(
      guest?._id ?? booking.user,
      isNoShow ? 'Booking marked as no-show' : 'Booking cancelled by host',
      actionMessage,
      request._id,
    ),
    queueNotification(
      host?._id ?? booking.author,
      isNoShow ? 'No-show report received' : 'Host cancellation recorded',
      actionMessage,
      request._id,
    ),
    queueEmail(
      guest?.email,
      isNoShow
        ? 'Your DAYF Booking Was Marked as No-Show'
        : 'Your DAYF Booking Was Cancelled by the Host',
      emailLayout(
        isNoShow ? 'No-show recorded' : 'Booking cancelled by host',
        `<p>Booking <strong>${escapeHtml(booking.bookingCode)}</strong></p>
         <p>${escapeHtml(actionMessage)}</p>`,
      ),
    ),
    sendSmsSafely(
      guest?.phoneNumber,
      isNoShow
        ? `DAYF: Booking ${booking.bookingCode} was marked as no-show.`
        : `DAYF: Booking ${booking.bookingCode} was cancelled by the host.`,
    ),
    sendSmsSafely(
      host?.phoneNumber,
      isNoShow
        ? `DAYF: No-show report for booking ${booking.bookingCode} was recorded.`
        : `DAYF: Your cancellation of booking ${booking.bookingCode} was recorded.`,
    ),
    queueEmail(
      host?.email,
      isNoShow
        ? 'Your DAYF No-Show Report Was Recorded'
        : 'Your DAYF Host Cancellation Was Recorded',
      emailLayout(
        isNoShow ? 'No-show report received' : 'Host cancellation recorded',
        `<p>Booking <strong>${escapeHtml(booking.bookingCode)}</strong></p>
         <p>${escapeHtml(actionMessage)}</p>`,
      ),
    ),
    ...admins.flatMap(admin => [
      queueNotification(
        admin._id,
        suspicious ? 'Suspicious host cancellation' : 'Host booking action',
        `Booking ${booking.bookingCode}: ${actionMessage}`,
        request._id,
      ),
      queueEmail(
        admin.email,
        suspicious
          ? 'Action Required: Suspicious Host Cancellation'
          : 'DAYF Host Cancellation / No-Show Update',
        emailLayout(
          suspicious ? 'Manual validation required' : 'Booking action recorded',
          `<p>Booking <strong>${escapeHtml(booking.bookingCode)}</strong></p>
           <p>${escapeHtml(actionMessage)}</p>`,
        ),
      ),
    ]),
  ]);

  emitCancellationUpdates(
    {
      ...booking.toObject(),
      status: isNoShow
        ? BOOKING_STATUS.no_show
        : BOOKING_STATUS.cancelled,
    },
    request,
  );
  return RefundRequest.findById(request._id).populate([
    { path: 'booking', select: 'bookingCode status paymentStatus' },
    { path: 'guest', select: 'name email' },
    { path: 'host', select: 'name email status suspendedUntil' },
  ]);
};

const getMyRefundRequests = (guestId: string) =>
  RefundRequest.find({ guest: guestId })
    .populate('booking', 'bookingCode startDate endDate status paymentStatus')
    .sort({ createdAt: -1 });

const getAllRefundRequests = (query: Record<string, any>) => {
  const filter: Record<string, any> = {};
  if (query.status) filter.status = query.status;
  if (query.isEligible !== undefined) {
    filter.isEligible = String(query.isEligible) === 'true';
  }
  return RefundRequest.find(filter)
    .populate('booking', 'bookingCode startDate endDate status paymentStatus')
    .populate('guest', 'name email')
    .populate('host', 'name email')
    .populate('reviewedBy', 'name email')
    .sort({ createdAt: -1 });
};

const updateRefundRequest = async (
  id: string,
  adminId: string,
  payload: {
    status: string;
    adminNote?: string;
    manualRefundReference?: string;
  },
) => {
  const request = await RefundRequest.findById(id);
  if (!request) {
    throw new AppError(httpStatus.NOT_FOUND, 'Refund request not found');
  }
  if (!request.isEligible) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'This cancellation is not eligible for a refund',
    );
  }
  if (
    [REFUND_REQUEST_STATUS.rejected, REFUND_REQUEST_STATUS.refunded].includes(
      request.status as any,
    )
  ) {
    throw new AppError(
      httpStatus.CONFLICT,
      'This refund request is already finalized',
    );
  }
  if (
    payload.status === REFUND_REQUEST_STATUS.refunded &&
    !payload.manualRefundReference
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Manual refund reference is required',
    );
  }

  const session = await startSession();
  try {
    await session.withTransaction(async () => {
      request.status = payload.status as any;
      request.adminNote = payload.adminNote;
      request.manualRefundReference = payload.manualRefundReference;
      request.reviewedBy = new Types.ObjectId(adminId);
      request.reviewedAt = new Date();
      request.history.push({
        action: `refund_${payload.status}`,
        actor: new Types.ObjectId(adminId),
        note: payload.adminNote,
        at: new Date(),
      });
      if (payload.status === REFUND_REQUEST_STATUS.refunded) {
        request.refundedAt = new Date();
        await Payments.updateOne(
          { _id: request.payment },
          {
            $set: {
              status: PAYMENT_STATUS.refunded,
              refundedAmount: request.refundAmount,
              refundReason: request.reason,
            },
          },
          { session },
        );
        await Bookings.updateOne(
          { _id: request.booking },
          { $set: { paymentStatus: PAYMENT_STATUS.refunded } },
          { session },
        );
      }
      await request.save({ session });
    });
  } finally {
    await session.endSession();
  }

  const populated = await RefundRequest.findById(id)
    .populate('guest', 'name email')
    .populate('booking', 'bookingCode');
  const guest = populated?.guest as any;
  const booking = populated?.booking as any;
  const statusText =
    payload.status === REFUND_REQUEST_STATUS.refunded
      ? `Your refund has been marked as completed. Reference: ${payload.manualRefundReference}.`
      : `Your refund request status is now ${payload.status}.`;

  await Promise.all([
    queueNotification(
      guest?._id ?? request.guest,
      'Refund request updated',
      statusText,
      request._id,
    ),
    queueEmail(
      guest?.email,
      'Your DAYF Refund Request Was Updated',
      emailLayout(
        'Refund status updated',
        `<p>Hi ${escapeHtml(guest?.name)},</p>
         <p>Booking <strong>${escapeHtml(booking?.bookingCode)}</strong></p>
         <p>${escapeHtml(statusText)}</p>
         ${payload.adminNote ? `<p>Admin note: ${escapeHtml(payload.adminNote)}</p>` : ''}`,
      ),
    ),
  ]);

  return populated;
};

export const refundRequestService = {
  createCancellationRequest,
  createHostCancellationAction,
  getMyRefundRequests,
  getAllRefundRequests,
  updateRefundRequest,
  getActivePolicy,
  updateActivePolicy,
};
