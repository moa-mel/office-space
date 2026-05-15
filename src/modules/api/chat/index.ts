import { Module } from "@nestjs/common";
import { ChatService } from "./services";
import { ChatController } from "./controllers";
import { ChatGateway } from "./gateway";
import { PrismaModule } from "@/modules/core/prisma";


@Module({
  imports: [],
  providers: [ChatService, ChatGateway],
  controllers: [ChatController],
  exports: [],
})
export class ChatModule {}