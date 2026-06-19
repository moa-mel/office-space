import { Module } from "@nestjs/common";
import { BookingService } from "./services";
import { BookingController } from "./controllers";
import { MailService } from "@/mail/mail.service";

@Module({
    imports: [MailService],
      providers: [BookingService],
      controllers: [BookingController],
      exports: [],
})
export class BookingModule {}