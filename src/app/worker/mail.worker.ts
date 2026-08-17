import { Worker } from 'bullmq';
import { connection } from '../redis';
import { sendEmail } from '../utils/mailSender';
import logger from '../utils/logger';

const mailWorker = new Worker(
  'general_mail',
  async job => {
    if (job.name === 'new_mail') {
      const data = job.data;

      const payload = data?.data;

      try {
        const attachments = Array.isArray(data?.attachments)
          ? data.attachments.map(
              (attachment: {
                filename: string;
                contentBase64: string;
                contentType?: string;
              }) => ({
                filename: attachment.filename,
                content: Buffer.from(attachment.contentBase64, 'base64'),
                contentType: attachment.contentType,
              }),
            )
          : undefined;

        await sendEmail(
          data?.email,
          data?.subject || 'Your Dayf Verification Code',
          data?.html,
          attachments,
        );
      } catch (error) {
        console.error('❌ Notification job processing failed:', error);
        throw error;
      }
    }
  },
  { connection },
);

mailWorker.on('completed', job => {
  logger.info({ jobId: job.id, queue: job.queueName }, 'Mail job completed');
});

mailWorker.on('failed', (job, err) => {
  logger.error({ err, jobId: job?.id, queue: job?.queueName }, 'Mail job failed');
});

mailWorker.on('error', error => {
  logger.error({ err: error }, 'Mail worker Redis error');
});

export default mailWorker;
