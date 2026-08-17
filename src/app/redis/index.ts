import { createClient, type RedisClientType } from 'redis';
import colors from 'colors';
import { Queue } from 'bullmq';
import config from '../config';
// import config from '@app/config/index.js';

const redisHost = config.redis_host || 'project_format_redis';
const redisPort = parseInt(config.redis_port || '6379');
const redisUrl = `redis://${redisHost}:${redisPort}`;

const pubClient: RedisClientType = createClient({
  url: redisUrl,
  password: config.redis_password as string,
});
const subClient: RedisClientType = pubClient.duplicate({
  password: config.redis_password as string,
});

pubClient.on('error', error => {
  console.error('❌ Redis publisher error:', error);
});

subClient.on('error', error => {
  console.error('❌ Redis subscriber error:', error);
});

const connection = {
  host: redisHost,
  port: redisPort,
  password: config.redis_password as string,
};

const connectRedis = async () => {
  await Promise.all([
    pubClient.isOpen ? Promise.resolve() : pubClient.connect(),
    subClient.isOpen ? Promise.resolve() : subClient.connect(),
  ]);
  console.log(colors.blue.bold('✨ Connected to Redis server'));
};

const eventQueue = new Queue('event_notification', { connection });

const notificationQueue = new Queue('general_notification', { connection });
const sendMailQueue = new Queue('general_mail', { connection });

for (const queue of [eventQueue, notificationQueue, sendMailQueue]) {
  queue.on('error', error => {
    console.error(`❌ Redis queue error (${queue.name}):`, error);
  });
}

const closeRedis = async () => {
  await Promise.allSettled([
    eventQueue.close(),
    notificationQueue.close(),
    sendMailQueue.close(),
  ]);

  await Promise.allSettled([
    pubClient.isOpen ? pubClient.quit() : Promise.resolve(),
    subClient.isOpen ? subClient.quit() : Promise.resolve(),
  ]);
};

export {
  pubClient,
  subClient,
  connectRedis,
  closeRedis,
  eventQueue,
  notificationQueue,
  connection,
  sendMailQueue,
};
