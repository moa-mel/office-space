import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from "@nestjs/common"
import { EventService } from "../services"
import { AuthGuard } from "../../auth/guards"
import { CreateEventDto, GetHostAvailabilityDto, UpdateEventDto } from "../dtos"
import { User } from "@prisma/client";
import { GetUser } from "../../user/decorators"

@UseGuards(AuthGuard)
@Controller({
    path: 'events'
})
export class EventController {
    constructor(
        private readonly eventService: EventService
    ) { }

    @Post(':id')
    async createEvent(
        @GetUser() user: User,
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: CreateEventDto
    ){
        return this.eventService.createEvent(user, id, dto);
    }

    @Get('availability')
    async getHostAvailability(
        @GetUser() user: User,
        @Query() dto: GetHostAvailabilityDto
    ) {
        return this.eventService.getHostAvailability(dto);
    }

    @Get(':id')
    async fetchEvent(
        @GetUser() user: User,
        @Param('id', ParseIntPipe) id: number
    ) {
        return this.eventService.fetchEvent(user, id);
    }

    @Patch(':id')
    async updateEvent(
        @GetUser() user: User,
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateEventDto
    ) {
        return this.eventService.updateEvent(user, id, dto);
    }
}