import httpStatus from 'http-status';
import AppError from '../error/AppError';
import MessageModerationLog from '../modules/messages/messageModeration.models';

const CONTACT_PATTERNS = [
  {
    type: 'email address',
    pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  },
  {
    type: 'obfuscated email address',
    pattern:
      /\b[A-Z0-9._%+-]+\s*(?:\[?\s*at\s*\]?|\(at\))\s*[A-Z0-9.-]+\s*(?:\[?\s*dot\s*\]?|\(dot\))\s*[A-Z]{2,}\b/i,
  },
  {
    type: 'Algerian international phone number',
    pattern: /(?:\+|00)\s*213(?:[\s.-]*\d){8,9}\b/i,
  },
  {
    type: 'Algerian mobile number',
    pattern: /\b0[567](?:[\s.-]*\d){8}\b/i,
  },
];

export const assertNoExternalContactDetails = async (
  text?: string | null,
  context?: {
    sender?: unknown;
    receiver?: unknown;
    channel?: 'rest' | 'socket';
  },
) => {
  if (!text?.trim()) return;
  const match = CONTACT_PATTERNS.find(item => item.pattern.test(text));
  if (match) {
    await MessageModerationLog.create({
      sender: context?.sender,
      receiver: context?.receiver,
      channel: context?.channel ?? 'rest',
      matchedType: match.type,
      textPreview: text.replace(match.pattern, '[REDACTED]').slice(0, 120),
    });
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Sharing an external ${match.type} is not allowed in DAYF messages`,
    );
  }
};
