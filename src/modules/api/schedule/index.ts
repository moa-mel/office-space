import { Module } from "@nestjs/common";
import { SchedulerService } from "./services";
import { PrismaModule } from "@/modules/core/prisma";

@Module({
  imports: [PrismaModule],
  providers: [SchedulerService],
  controllers: [],
})
export class SchedulerModule {}