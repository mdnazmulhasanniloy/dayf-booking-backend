import { Worker } from 'bullmq';
import { connection } from '../redis';
import firebaseAdmin from '../utils/firebase';
import { User } from '../modules/user/user.models';
import { Notification } from '../modules/notification/notification.model';
import { getSocketId } from '../../socket';

const notificationWorker = new Worker(
  'general_notification',
  async job => {
    if (job.name === 'new_notification') {
      const data = job.data;
      const payload = data?.data;
      console.log({
        payload,
        data,
      });
      try {
        const saved = Notification.create(data);
        console.log(saved);

        // 👉 to do:
        // - WebSocket emit
        //@ts-ignore
        const io = global.socketio;
        console.log('🚀 ~ io:', io);
        // 2. WebSocket emit
        if (io) {
          io.emit('notification::' + payload?.receiver, saved);
          const userSocketId = getSocketId(payload.receiverId?.toString());

          if (userSocketId) {
            io.to(userSocketId).emit('notification', saved);
          }
        }

        // 3. Push notification (FCM)
        if (payload.receiver) {
          const user = await User.findById(payload.receiver);

          if (user?.fcmToken) {
            const token = user.fcmToken;
            firebaseAdmin.messaging().send({
              token,
              notification: {
                title: payload.title,
                body: payload.message,
              },
              data: payload,
            });
          }

          // 4. Email send (todo)
        }
      } catch (error) {
        console.error('❌ Notification job processing failed:', error);
        throw error;
      }
    }
  },
  { connection },
);

notificationWorker.on('completed', job => {
  console.log(`✅ Job completed: ${job.id}`);
});

notificationWorker.on('failed', (job, err) => {
  console.error(`❌ Job failed: ${job?.id}`, err);
});
