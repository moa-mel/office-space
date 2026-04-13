import { Module } from "@nestjs/common";
import { OfficeService } from "./services";
import { OfficeController } from "./controllers";
import { PrismaModule } from "@/modules/core/prisma";
import { EmailModule } from "../email";


@Module({
  imports: [EmailModule],
  providers: [OfficeService],
  controllers: [OfficeController],
  exports: [],
})
export class OfficeModule {}