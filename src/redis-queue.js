const Queue = require('bull');
const Redis = require('ioredis');

const redisUrl = process.env.REDISCLOUD_URL;

const client = new Redis(redisUrl);
const subscriber = new Redis(redisUrl);

const opts = {
  createClient(type) {
    switch (type) {
      case 'client':
        return client;
      case 'subscriber':
        return subscriber;
      default:
        return new Redis(redisUrl);
    }
  },
};

export const mailFetchQueue = new Queue('mail-fetch', opts);
export const emailToJsonQueue = new Queue('email-to-json', opts);
export const autoUnlockQueue = new Queue('auto-unlock', opts);
