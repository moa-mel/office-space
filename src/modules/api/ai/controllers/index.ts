import { Body, Controller, Param, Post } from "@nestjs/common";
import { AIService } from "../services";

@Controller({
    path: 'ai'
})

export class AIController {
    constructor(private readonly aiService: AIService) { }
    @Post('schedule')
    parseSchedule(@Body() body: { userId: string; message: string }) {
        return this.aiService.parseSchedulingRequest(body.userId, body.message);
    }

    @Post('call/:callId/summarize')
    summarize(@Param('callId') callId: string) {
        return this.aiService.summarizeCall(callId);
    }

}