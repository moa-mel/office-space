import { Module } from "@nestjs/common";
import { ChatService } from "./services";
import { ChatController } from "./controllers";


@Module({
  imports: [],
  providers: [ChatService],
  controllers: [ChatController],
  exports: [],
})
export class ChatModule {}