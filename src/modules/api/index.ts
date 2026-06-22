import { Module } from "@nestjs/common";
import { AuthModule } from "./auth";
import { OfficeModule } from "./office";
import { ChatModule } from "./chat";
import { UserModule } from "./user";
import { EventModule } from "./event";
import { CallModule } from "./call";
import { AIModule } from "./ai";


@Module({
  imports: [
    AuthModule,
    UserModule,
    OfficeModule,
    ChatModule,
    EventModule,
    CallModule,
    AIModule,
  ],
})
export class ApiModule {}