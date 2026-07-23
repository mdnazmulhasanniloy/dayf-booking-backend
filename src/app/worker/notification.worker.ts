import { Worker } from 'bullmq';
import { connection } from '../redis';
import firebaseAdmin from '../utils/firebase';
import { User } from '../modules/user/user.models';
import { Notification } from '../modules/notification/notification.model';
import { getSocketId } from '../../socket';
import { isValidObjectId } from 'mongoose';

const notificationWorker = new Worker(
  'general_notification',
  async job => {
    if (job.name === 'new_notification') {
      // Producers currently enqueue the notification directly. Keep support
      // for the older { data: notification } shape as well.
      const payload = job.data?.data ?? job.data;
      console.log(payload);
      try {
        const rawReceiver = payload?.receiver;
        const receiverId =
          rawReceiver && typeof rawReceiver === 'object'
            ? rawReceiver._id?.toString()
            : rawReceiver?.toString();

        if (!receiverId || !isValidObjectId(receiverId)) {
          throw new Error('Notification receiver is required');
        }

        const saved = await Notification.create({
          ...payload,
          receiver: receiverId,
        });

        // 👉 to do:
        // - WebSocket emit
        //@ts-ignore
        const io = global.socketio;
        // 2. WebSocket emit
        if (io) {
          io.emit('notification::' + receiverId, saved);
          const userSocketId = getSocketId(receiverId);

          if (userSocketId) {
            io.to(userSocketId).emit('notification', saved);
          }
        }

        // 3. Push notification (FCM)
        if (receiverId) {
          const user = await User.findById(receiverId);

          if (user?.fcmToken) {
            try {
              const response = await firebaseAdmin.messaging().send({
                token: user.fcmToken,

                notification: {
                  title: payload.title,
                  body: payload.message,
                },

                data: {
                  notificationId: saved._id.toString(),
                  receiver: receiverId,
                  message: String(payload.message ?? ''),
                  model_type: String(payload.model_type ?? ''),
                  refference: String(payload.refference ?? ''),
                },

                android: {
                  priority: 'high',
                },

                apns: {
                  payload: {
                    aps: {
                      sound: 'default',
                    },
                  },
                },
              });

              console.log('Notification sent:', response);
            } catch (error) {
              console.error('FCM Error:', error);
            }
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
