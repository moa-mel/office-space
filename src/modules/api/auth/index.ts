import { jwtExpiresIn, jwtSecret } from "@/config";
import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuthService } from "./services";
import { AuthController } from "./controllers";
import { MailModule } from "@/mail/mail.module";

@Module({
  imports: [
    MailModule,
    JwtModule.register({
      global: true,
      secret: jwtSecret,
      signOptions: { expiresIn: jwtExpiresIn as any },
    }),
  ],
  providers: [AuthService],
  controllers: [AuthController],
  exports: [JwtModule],
})
export class AuthModule {}