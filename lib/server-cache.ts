import { Redis } from "@upstash/redis";

export function getServerRedis() {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!redisUrl || !redisToken) return null;
  return new Redis({ token: redisToken, url: redisUrl });
}

export async function readServerCache<T>(key: string) {
  const redis = getServerRedis();
  if (!redis) return null;
  return (await redis.get(key)) as T | null;
}

export async function writeServerCache<T>(
  key: string,
  value: T,
  ttlSeconds: number,
) {
  const redis = getServerRedis();
  if (!redis) return;
  await redis.set(key, value, { ex: ttlSeconds });
}
