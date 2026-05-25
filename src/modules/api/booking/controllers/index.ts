import { Controller, UseGuards } from "@nestjs/common"
import { BookingService } from "../services"
import { AuthGuard } from "../../auth/guards"

@UseGuards(AuthGuard)
@Controller({
    path: 'bookings'
})
export class BookingController {
    constructor(
        private readonly bookingService: BookingService
    ) { }
}