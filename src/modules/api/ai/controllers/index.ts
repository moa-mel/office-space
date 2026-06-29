import { Body, Controller, HttpCode, HttpStatus, Param, Post, ValidationPipe } from "@nestjs/common";
import { AIService } from "../services";
import { ParseSchedulingRequestDto } from "../dtos";

@Controller({
    path: 'ai'
})

export class AIController {
    constructor(private readonly aiService: AIService) { }
    @HttpCode(HttpStatus.OK)
    @Post('schedule')
    parseSchedule(
        @Body(ValidationPipe) dto: ParseSchedulingRequestDto) {
        return this.aiService.handleParseSchedulingRequest(dto);
    }

    @HttpCode(HttpStatus.OK)
    @Post('call/:callId/summarize')
    summarize(@Param('callId') callId: string) {
        return this.aiService.summarizeCall(callId);
    }

}