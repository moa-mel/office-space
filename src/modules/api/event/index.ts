import { forwardRef, Module } from "@nestjs/common";
import { MailModule } from "@/mail/mail.module";
import { EventService } from "./services";
import { EventController } from "./controllers";
import { PrismaModule } from "@/modules/core/prisma";
import { AIModule } from "../ai";

@Module({
    imports: [MailModule, PrismaModule, forwardRef(() => AIModule)],
      providers: [EventService],
      controllers: [EventController],
      exports: [EventService],
})
export class EventModule {}