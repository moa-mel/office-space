import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post } from "@nestjs/common";
import { CallService } from "../services";
import { CreateCallDto } from "../dtos";

@Controller({
    path: 'calls'
})
export class CallController {
    constructor(private readonly callService: CallService) { }

    @HttpCode(HttpStatus.OK)
    @Post(':officeId')
    async createCall(
        @Param('officeId', ParseIntPipe) officeId: number,
        @Body() dto: CreateCallDto) {
        return this.callService.createCall(officeId, dto);
    }

    @HttpCode(HttpStatus.OK)
    @Post(':callId/participants/:userId')
    async addParticipant(
        @Param('callId') callId: string,
        @Param('userId') userId: string,
    ) {
        return this.callService.addParticipant(callId, userId);
    }

    @HttpCode(HttpStatus.OK)
    @Delete(':callId/participants/:userId')
    async removeParticipant(
        @Param('callId') callId: string,
        @Param('userId') userId: string,
    ) {
        return this.callService.removeParticipant(callId, userId);
    }

    @HttpCode(HttpStatus.OK)
    @Post(':callId/summarize')
    async endCallWithSummary(@Param('callId') callId: string) {
        return this.callService.endCallWithSummary(callId);
    }

    @HttpCode(HttpStatus.OK)
    @Get(':id')
    async findCallById(@Param('id') id: string) {
        return this.callService.findCallById(id);
    }

    @HttpCode(HttpStatus.OK)
    @Get()
    async fetchAllCall() {
        return this.callService.fetchAllCall();
    }

}