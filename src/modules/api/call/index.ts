import { Module } from '@nestjs/common';
import { CallService } from './services';
import { CallController } from './controllers';
import { CallsGateway } from './gateway';
import { PrismaModule } from '@/modules/core/prisma';
import { AIModule } from '../ai';

@Module({
  imports: [PrismaModule, AIModule],
  providers: [CallService, CallsGateway],
  controllers: [CallController],
})
export class CallModule {}