import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const host = config.get<string>('database.host')!;
        const port = config.get<number>('database.port')!;
        const username = config.get<string>('database.username')!;
        const password = config.get<string>('database.password')!;
        const database = config.get<string>('database.name')!;
        const synchronize = config.get<boolean>('database.synchronize') ?? false;
        const logging = config.get<boolean>('database.logging') ?? false;

        return {
          type: 'postgres',
          host,
          port,
          username,
          password,
          database,
          synchronize, // must be false for production
          logging,

          autoLoadEntities: true,

          // runtime migrations are run manually (recommended)
          migrationsRun: false,
        };
      },
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
