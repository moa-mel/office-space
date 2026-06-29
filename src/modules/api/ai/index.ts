import { forwardRef, Module } from '@nestjs/common';
import { AIService } from './services';
import { AIController } from './controllers';
import { PrismaModule } from '@/modules/core/prisma';
import { ConfigModule } from '@nestjs/config';
import { EventModule } from '../event';
import { CallModule } from '../call';

@Module({
  imports: [PrismaModule, ConfigModule.forRoot(), forwardRef(() => EventModule), forwardRef(() => CallModule)],
  providers: [AIService],
  controllers: [AIController],
  exports: [AIService],
})
export class AIModule {}