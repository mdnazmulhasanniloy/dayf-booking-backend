import twilio from 'twilio';
import config from '../config';

const credentialsAvailable = () =>
  Boolean(config.twilio.accountSid && config.twilio.authToken);

const getClient = () => {
  if (!credentialsAvailable()) {
    throw new Error('Twilio credentials are not configured');
  }
  return twilio(config.twilio.accountSid, config.twilio.authToken);
};

export const sendSms = async (to: string | undefined, body: string) => {
  if (!to) return;
  if (!config.twilio.phoneNumber) {
    throw new Error('TWILIO_PHONE_NUMBER is not configured');
  }
  return getClient().messages.create({
    to,
    from: config.twilio.phoneNumber,
    body,
  });
};

// Transactional SMS must never roll back a successful booking/payment.
export const sendSmsSafely = async (
  to: string | undefined,
  body: string,
) => {
  if (!to) return;
  try {
    await sendSms(to, body);
  } catch (error) {
    console.error('Twilio SMS delivery failed:', error);
  }
};
