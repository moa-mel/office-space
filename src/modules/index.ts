import { Module } from "@nestjs/common";
import { PrismaModule } from "./core/prisma";
import { ApiModule } from "./api";
import { RedisIntegrationModule } from "./core/redis/redis.module";

@Module({
  imports: [ ApiModule, PrismaModule, RedisIntegrationModule,],
})
export class AppModule {}