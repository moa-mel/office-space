import { forwardRef, Module } from '@nestjs/common';
import { CallService } from './services';
import { CallController } from './controllers';
import { CallsGateway } from './gateway';
import { PrismaModule } from '@/modules/core/prisma';
import { AIModule } from '../ai';

@Module({
  imports: [PrismaModule, forwardRef(() => AIModule)],
  providers: [CallService, CallsGateway],
  controllers: [CallController],
  exports: [CallService],
})
export class CallModule {}