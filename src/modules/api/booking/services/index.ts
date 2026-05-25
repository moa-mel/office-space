import { Injectable } from "@nestjs/common";
import { EmailService } from "../../email/services";
import { PrismaService } from "@/modules/core/prisma/services";

@Injectable()
export class BookingService {
    constructor(
        private prisma: PrismaService,
        private emailService: EmailService,
    ) { }
}