import { createClient } from "redis";

const subscriber = createClient({
  url: process.env.REDIS_URL,
});

await subscriber.connect();

export const subscribeToChannel = async (channel, callback) => {
  await subscriber.subscribe(channel, (message) => {
    const data = JSON.parse(message);
    callback(data);
  });
  console.log(`📡 Subscribed to ${channel}`);
};
