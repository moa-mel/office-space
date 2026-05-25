import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { EmailService } from "../../email/services";
import { PrismaService } from "@/modules/core/prisma/services";
import { CreateBookingDto } from "../dtos";
import { buildResponse } from "@/utils/api-response-util";

@Injectable()
export class BookingService {
    constructor(
        private prisma: PrismaService,
        private emailService: EmailService,
    ) { }

    async createBooking(userId: number, dto: CreateBookingDto) {
        if (userId === dto.hostId) {
            throw new BadRequestException('You cannot book a call with yourself');
        }

        const [requester, host] = await Promise.all([
            this.prisma.officeMember.findUnique({
                where: { officeId_userId: { officeId: dto.officeId, userId } },
                select: { officeId: true }
            }),
            this.prisma.officeMember.findUnique({
                where: { officeId_userId: { officeId: dto.officeId, userId: dto.hostId } },
                select: { officeId: true }
            })
        ]);

        if (!requester || !host) {
            throw new ForbiddenException('Both users must be members of the specified office to book a call');
        }

        // Create the booking record
        const booking = await this.prisma.booking.create({
            data: {
                userId,
                hostId: dto.hostId,
                officeId: dto.officeId,
                startDate: new Date(dto.startDate),
                endDate: new Date(dto.endDate),
                title: dto.title,
                notes: dto.notes,
                timezone: dto.timezone,
                meetingUrl: dto.meetingUrl,
            }
        });

        // TODO: Trigger EmailService here to send a calendar invite/notification to the host

        return buildResponse({
            message: "booking successfully created",
            data: booking
        })
    }

}