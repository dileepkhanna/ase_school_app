import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { RedisOptions } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client!: Redis;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const host = this.config.get<string>('redis.host')!;
    const port = this.config.get<number>('redis.port')!;
    const password = this.config.get<string | undefined>('redis.password');
    const db = this.config.get<number>('redis.db') ?? 0;
    const tlsEnabled = this.config.get<boolean>('redis.tls') ?? false;

    const opts: RedisOptions = {
      host,
      port,
      password: password || undefined,
      db,
      maxRetriesPerRequest: 2,
      enableReadyCheck: true,
      lazyConnect: false,
      retryStrategy(times) {
        // exponential-ish backoff
        return Math.min(times * 200, 2000);
      },
    };

    if (tlsEnabled) {
      // For Redis TLS deployments; local dev usually false
      (opts as any).tls = {};
    }

    this.client = new Redis(opts);

    this.client.on('connect', () => {
      // eslint-disable-next-line no-console
      console.log('✅ Redis connected');
    });

    this.client.on('error', (err) => {
      // eslint-disable-next-line no-console
      console.error('❌ Redis error:', err?.message ?? err);
    });
  }

  getClient(): Redis {
    return this.client;
  }

  /**
   * Distributed lock helper used by cron jobs.
   * Uses: SET key value NX EX ttlSeconds
   * Returns true if lock acquired, false otherwise.
   */
  async tryLock(key: string, ttlSeconds: number): Promise<boolean> {
    const ttl = Math.max(1, Math.floor(ttlSeconds));
    const value = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    // ioredis: set(key, value, 'EX', ttl, 'NX')
    const res = await this.client.set(key, value, 'EX', ttl, 'NX');
    return res === 'OK';
  }

  async setJson(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const payload = JSON.stringify(value);
    if (ttlSeconds && ttlSeconds > 0) {
      await this.client.set(key, payload, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, payload);
    }
  }

  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.client.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
    }
  }
}
