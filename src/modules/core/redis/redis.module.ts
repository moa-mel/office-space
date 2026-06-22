import { RedisModule } from "@nestjs-modules/ioredis";
import { Global, Module } from "@nestjs/common";
import { Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from "@nestjs/config";

const logger = new Logger('RedisIntegration');

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    RedisModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        const host = configService.get<string>('REDIS_HOST');
        const port = Number(configService.get<number>('REDIS_PORT'));
        const password = configService.get<string>('REDIS_PASSWORD');
        const url = configService.get<string>('redis_url');
        logger.debug(`Connecting to Redis at ${host}:${port}`);
        return {
          type: 'single',
          host,
          port,
          password,
          url,
          tls: {},
        };
      },
      inject: [ConfigService],
    }),
  ],
})
export class RedisIntegrationModule {}