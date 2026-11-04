import { createClient } from "redis";

const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://127.0.0.1:6379",
});

redisClient.on("error", (error) => {
  console.error("Redis client error:", error.message);
});

let connectionPromise = null;

export async function connectRedis() {
  if (redisClient.isOpen) return redisClient;

  if (connectionPromise) return connectionPromise;

  connectionPromise = redisClient
    .connect()
    .then(() => {
      console.log("Redis connected");
      return redisClient;
    })
    .catch((error) => {
      connectionPromise = null;
      throw error;
    });

  return connectionPromise;
}

function getClient() {
  if (!redisClient.isOpen) {
    throw new Error("Redis is not connected yet");
  }

  return redisClient;
}

export async function setValue(key, value, ttlSeconds) {
  const ttl = Number(ttlSeconds);

  if (!Number.isInteger(ttl) || ttl <= 0) {
    throw new Error("Redis SET requires a positive TTL in seconds");
  }

  return getClient().set(key, String(value), { EX: ttl });
}

export async function getValue(key) {
  return getClient().get(key);
}

export async function deleteValue(key) {
  return getClient().del(key);
}

export async function existsKey(key) {
  const result = await getClient().exists(key);
  return result === 1;
}

export async function getTtl(key) {
  return getClient().ttl(key);
}

export async function setOtp(email, purpose, otp, ttlSeconds) {
  const key = `otp:${purpose}:${String(email).toLowerCase().trim()}`;
  await setValue(key, otp, ttlSeconds);
  return key;
}

export async function getOtp(email, purpose) {
  const key = `otp:${purpose}:${String(email).toLowerCase().trim()}`;
  return getValue(key);
}

export async function deleteOtp(email, purpose) {
  const key = `otp:${purpose}:${String(email).toLowerCase().trim()}`;
  return deleteValue(key);
}
