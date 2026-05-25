import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "@/modules/core/prisma/services";
import { CreateBookingDto } from "../dtos";
import { buildResponse } from "@/utils/api-response-util";
import { MailService } from "@/mail/mail.service";

@Injectable()
export class BookingService {
    constructor(
        private prisma: PrismaService,
        private mailService: MailService,
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
            },
            include: {
                host: true
            }
        });

        this.mailService
            .createBooking(
                booking.host.firstName,
                booking.host.email,
                booking.title ?? 'New Booking',
                booking.startDate.toISOString(),
                booking.endDate.toISOString(),
                booking.timezone ?? 'UTC',
                booking.meetingUrl ?? 'N/A',
                booking.notes ?? ''
            )
            .catch((err) => console.error('Failed to send create booking email:', err));

        return buildResponse({
            message: "booking successfully created",
            data: booking
        })
    }

}