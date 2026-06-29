import { Body, Controller, Get, Param, ParseIntPipe, Patch, Query, UseGuards } from "@nestjs/common"
import { EventService } from "../services"
import { AuthGuard } from "../../auth/guards"
import { GetHostAvailabilityDto, UpdateEventDto } from "../dtos"
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