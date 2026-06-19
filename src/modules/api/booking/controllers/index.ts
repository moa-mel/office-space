import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from "@nestjs/common"
import { BookingService } from "../services"
import { AuthGuard } from "../../auth/guards"
import { CreateBookingDto, GetHostAvailabilityDto, UpdateBookingDto } from "../dtos"
import { User } from "@prisma/client";
import { GetUser } from "../../user/decorators";

@UseGuards(AuthGuard)
@Controller({
    path: 'bookings'
})
export class BookingController {
    constructor(
        private readonly bookingService: BookingService
    ) { }

    @Post()
    async createBooking(
        @GetUser() user: User,
        @Param('officeId', ParseIntPipe) officeId: number,
        @Body() dto: CreateBookingDto
    ) {
        return this.bookingService.createBooking(user, officeId, dto);
    }

    @Get('availability')
    async getHostAvailability(
        @GetUser() user: User,
        @Query() dto: GetHostAvailabilityDto
    ) {
        return this.bookingService.getHostAvailability(dto);
    }

    @Get(':id')
    async fetchBooking(
        @GetUser() user: User,
        @Param('id', ParseIntPipe) id: number
    ) {
        return this.bookingService.fetchBooking(user, id);
    }

    @Patch(':id')
    async updateBooking(
        @GetUser() user: User,
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateBookingDto
    ) {
        return this.bookingService.updateBooking(user, id, dto);
    }
}