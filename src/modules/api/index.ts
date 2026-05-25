import { Module } from "@nestjs/common";
import { AuthModule } from "./auth";
import { OfficeModule } from "./office";
import { ChatModule } from "./chat";
import { UserModule } from "./user";
import { BookingModule } from "./booking";


@Module({
  imports: [
    AuthModule,
    UserModule,
    OfficeModule,
    ChatModule,
    BookingModule,
  ],
})
export class ApiModule {}