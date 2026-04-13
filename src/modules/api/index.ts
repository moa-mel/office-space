import { Module } from "@nestjs/common";
import { AuthModule } from "./auth";
import { EmailModule } from "./email";
import { OfficeModule } from "./office";
import { ChatModule } from "./chat";
import { UserModule } from "./user";


@Module({
  imports: [
    AuthModule,
    EmailModule,
    UserModule,
    OfficeModule,
    ChatModule
  ],
})
export class ApiModule {}