import { Module } from '@nestjs/common';
import { AIService } from './services';
import { AIController } from './controllers';
import { PrismaModule } from '@/modules/core/prisma';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [PrismaModule, ConfigModule.forRoot()],
  providers: [AIService],
  controllers: [AIController],
  exports: [AIService],
})
export class AIModule {}