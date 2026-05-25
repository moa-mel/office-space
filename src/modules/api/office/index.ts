import { Module } from "@nestjs/common";
import { OfficeService } from "./services";
import { OfficeController } from "./controllers";
import { PrismaModule } from "@/modules/core/prisma";
import { MailModule } from "@/mail/mail.module";


@Module({
  imports: [MailModule],
  providers: [OfficeService],
  controllers: [OfficeController],
  exports: [],
})
export class OfficeModule {}