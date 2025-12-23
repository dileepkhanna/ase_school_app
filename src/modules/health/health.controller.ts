import { Controller, Get } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { RedisService } from '../../integrations/redis/redis.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly dataSource: DataSource,
    private readonly redisService: RedisService,
  ) {}

  @Get()
  async health() {
    const startedAt = Date.now();

    // DB health
    let dbOk = false;
    try {
      await this.dataSource.query('SELECT 1;');
      dbOk = true;
    } catch {
      dbOk = false;
    }

    // Redis health
    let redisOk = false;
    try {
      const client = this.redisService.getClient();
      const pong = await client.ping();
      redisOk = pong === 'PONG';
    } catch {
      redisOk = false;
    }

    return {
      status: dbOk && redisOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      checks: {
        database: dbOk ? 'up' : 'down',
        redis: redisOk ? 'up' : 'down',
      },
      latencyMs: Date.now() - startedAt,
    };
  }
}
