import { Controller } from "@nestjs/common";
import { ChatService } from "../services";


@Controller({
    path: 'chat',
})
export class ChatController {
    constructor(private readonly chatService: ChatService) { }

}