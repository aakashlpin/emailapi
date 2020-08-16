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

const createApiQueue = new Queue('create-api', opts);
export default createApiQueue;
