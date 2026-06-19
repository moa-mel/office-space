import { Module } from "@nestjs/common";
import { BookingService } from "./services";
import { BookingController } from "./controllers";
import { MailModule } from "@/mail/mail.module";

@Module({
    imports: [MailModule],
      providers: [BookingService],
      controllers: [BookingController],
      exports: [],
})
export class BookingModule {}