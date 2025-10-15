import redisClient from "./redisClient.js";

export const publish = async (channel, message) => {
    await redisClient.publish(channel, message);
    console.log(`Message "${message}" published to channel "${channel}"`);
}