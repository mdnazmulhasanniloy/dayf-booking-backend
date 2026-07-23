import { Worker } from 'bullmq';
import { connection } from '../redis';
import { sendEmail } from '../utils/mailSender';

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
  console.log(`✅ Mail Send Complete: ${job.id}`);
});

mailWorker.on('failed', (job, err) => {
  console.error(`❌ Mail Send failed: ${job?.id}`, err);
});
