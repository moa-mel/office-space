import { Module } from "@nestjs/common";
import { AuthModule } from "./auth";
import { EmailModule } from "./email";


@Module({
  imports: [
    AuthModule,
    EmailModule
  ],
})
export class ApiModule {}