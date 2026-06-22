import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from "@nestjs/common"
import { EventService } from "../services"
import { AuthGuard } from "../../auth/guards"
import { CreateEventDto, GetHostAvailabilityDto, UpdateEventDto } from "../dtos"
import { User } from "@prisma/client";
import { GetUser } from "../../user/decorators";

@UseGuards(AuthGuard)
@Controller({
    path: 'Events'
})
export class EventController {
    constructor(
        private readonly EventService: EventService
    ) { }

    @Post()
    async createEvent(
        @GetUser() user: User,
        @Param('officeId', ParseIntPipe) officeId: number,
        @Body() dto: CreateEventDto
    ) {
        return this.EventService.createEvent(user, officeId, dto);
    }

    @Get('availability')
    async getHostAvailability(
        @GetUser() user: User,
        @Query() dto: GetHostAvailabilityDto
    ) {
        return this.EventService.getHostAvailability(dto);
    }

    @Get(':id')
    async fetchEvent(
        @GetUser() user: User,
        @Param('id', ParseIntPipe) id: number
    ) {
        return this.EventService.fetchEvent(user, id);
    }

    @Patch(':id')
    async updateEvent(
        @GetUser() user: User,
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateEventDto
    ) {
        return this.EventService.updateEvent(user, id, dto);
    }
}