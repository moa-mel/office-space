import { Module } from "@nestjs/common";
import { EmailService } from "./services";
import { ConfigModule } from "@nestjs/config";

@Module({
  imports: [ConfigModule],
  providers: [EmailService],
  exports: [EmailService],
})

export class EmailModule {}