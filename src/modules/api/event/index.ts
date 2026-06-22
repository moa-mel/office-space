import { Module } from "@nestjs/common";
import { MailModule } from "@/mail/mail.module";
import { EventService } from "./services";
import { EventController } from "./controllers";

@Module({
    imports: [MailModule],
      providers: [EventService],
      controllers: [EventController],
      exports: [],
})
export class EventModule {}