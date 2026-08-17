/* eslint-disable @typescript-eslint/ban-ts-comment */
import dns from 'dns';
// Force Google DNS servers before any connection attempt
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
dns.setDefaultResultOrder('ipv4first');

import { createServer, Server } from 'http';
import mongoose from 'mongoose';
import app from './app';
import config from './app/config';
import initializeSocketIO from './socket';
import { defaultTask } from './app/utils/defaultTask';
import mailWorker from './app/worker/mail.worker';
import notificationWorker from './app/worker/notification.worker';
import { closeRedis, connectRedis } from './app/redis';

const colors = require('colors');

let server: Server;
export const io = initializeSocketIO(createServer(app));

async function main() {
  // const customer = await ChargilyService.createCustomer({
  //   name: "user?.email",
  //   email: "nazmul@gmail.com",
  // });
  // try {
  //   const response = await firebaseAdmin.messaging().send({
  //     token:
  //       'c40gw41R0Mqc7VCx3Dj5aR:APA91bHGgekptpcK5qA6WBkSWrTiIQmUGLi8saxIIb3wXewN3VRvNPOizC_95uWOPXKco4hn-8cOdAy606Q4o180zDo5f3NnjOJ8N7fUtECZ_B-vyeSu7GA',
  //     notification: {
  //       title: 'Hello',
  //       body: 'Test notification',
  //     },

  //     data: {
  //       type: 'test',
  //       screen: 'home',
  //     },

  //     android: {
  //       priority: 'high',
  //     },

  //     apns: {
  //       payload: {
  //         aps: {
  //           sound: 'default',
  //         },
  //       },
  //     },
  //   });

  //   console.log('Notification sent:', response);
  // } catch (error) {
  //   console.error('FCM Error:', error);
  // }

  // console.log(customer);
  try {
    await connectRedis();
    await mongoose.connect(config.database_url as string);
    defaultTask();
    server = app.listen(Number(config.port), config.ip as string, () => {
      console.log(
        //@ts-ignore
        `app is listening on http://${config.ip}:${config.port}`.green.bold,
      );
    });
    io.listen(Number(config.socket_port));
    console.log(
      //@ts-ignore
      `Socket is listening on port ${config.ip}:${config.socket_port}`.yellow
        .bold,
    );

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    global.socketio = io;
  } catch (err) {
    console.error(err);
  }
}
main();

let isShuttingDown = false;

const shutdown = async (reason: string, exitCode: number) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`Shutting down: ${reason}`);

  const closeHttpServer = server
    ? new Promise<void>(resolve => server.close(() => resolve()))
    : Promise.resolve();

  await Promise.allSettled([
    closeHttpServer,
    mailWorker.close(),
    notificationWorker.close(),
    closeRedis(),
    mongoose.disconnect(),
  ]);

  io.close();
  process.exit(exitCode);
};

process.on('SIGTERM', () => void shutdown('SIGTERM', 0));
process.on('SIGINT', () => void shutdown('SIGINT', 0));
process.on('unhandledRejection', error => {
  console.error('Unhandled rejection:', error);
  void shutdown('unhandledRejection', 1);
});
process.on('uncaughtException', error => {
  console.error('Uncaught exception:', error);
  void shutdown('uncaughtException', 1);
});
