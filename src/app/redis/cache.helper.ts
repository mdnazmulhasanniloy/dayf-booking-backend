/* eslint-disable @typescript-eslint/no-explicit-any */
import { pubClient } from './index.js';

class CacheHelper {
  // 🔥 Get Data
  static async get<T>(key: string): Promise<T | null> {
    try {
      const data = await pubClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('❌ Cache GET error:', error);
      return null;
    }
  }

  // 🔥 Set Data
  static async set(key: string, value: any, ttl = 300): Promise<void> {
    try {
      await pubClient.set(key, JSON.stringify(value), {
        EX: ttl,
      });
    } catch (error) {
      console.error('❌ Cache SET error:', error);
    }
  }

  // 🔥 Delete single key
  static async del(key: string): Promise<void> {
    try {
      await pubClient.del(key);
    } catch (error) {
      console.error('❌ Cache DEL error:', error);
    }
  }

  // 🔥 Delete by pattern (safe way using SCAN)
  static async delByPattern(pattern: string): Promise<void> {
    try {
      const iterator = pubClient.scanIterator({
        MATCH: pattern,
        COUNT: 100,
      });

      for await (const keys of iterator) {
        console.log('🔑 Keys found:', keys);

        // scanIterator এ প্রতিটা chunk একটা array of strings
        if (Array.isArray(keys)) {
          for (const key of keys) {
            if (key) {
              console.log(`Deleting cache key: ${key}`);
              await pubClient.del(key);
            }
          }
        } else {
          // single string হলে সরাসরি delete
          if (keys) {
            console.log(`Deleting cache key: ${keys}`);
            await pubClient.del(keys);
          }
        }
      }
    } catch (error) {
      console.error('❌ Cache Pattern Delete error:', error);
    }
  }
  // 🔥 Generate key (standardized)
  static generateKey(base: string, query?: any): string {
    return query ? `${base}:${JSON.stringify(query)}` : base;
  }
}

export default CacheHelper;
