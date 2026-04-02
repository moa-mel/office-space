import { jwtExpiresIn, jwtSecret } from "@/config";
import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuthService } from "./services";
import { AuthController } from "./controllers";
import { EmailModule } from "../email";

@Module({
  imports: [
    EmailModule,
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