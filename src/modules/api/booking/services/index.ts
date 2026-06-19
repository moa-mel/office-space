import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@/modules/core/prisma/services";
import { CreateBookingDto, GetHostAvailabilityDto, UpdateBookingDto } from "../dtos";
import { buildResponse } from "@/utils/api-response-util";
import { MailService } from "@/mail/mail.service";
import { generateId } from "@/utils";
import { User } from "@prisma/client";

@Injectable()
export class BookingService {
    constructor(
        private prisma: PrismaService,
        private mailService: MailService,
    ) { }

    async createBooking(user: User, officeId: number, dto: CreateBookingDto) {
        if (user.id === dto.hostId) {
            throw new BadRequestException('You cannot book a call with yourself');
        }

        const requestedStartDate = new Date(dto.startDate);
        const requestedEndDate = new Date(dto.endDate);

        const now = new Date();
        if (requestedStartDate < now) {
            throw new BadRequestException('Cannot schedule a booking in the past');
        }

        if (requestedStartDate >= requestedEndDate) {
            throw new BadRequestException('End date must be after the start date');
        }

        const [requester, host] = await Promise.all([
            this.prisma.officeMember.findUnique({
                where: { officeId_userId: { officeId: officeId, userId: user.id } },
                select: { officeId: true }
            }),
            this.prisma.officeMember.findUnique({
                where: { officeId_userId: { officeId: officeId, userId: dto.hostId } },
                select: { officeId: true }
            })
        ]);

        if (!requester || !host) {
            throw new ForbiddenException('Both users must be members of the specified office to book a call');
        }

        const conflictingBooking = await this.prisma.booking.findFirst({
            where: {
                hostId: dto.hostId,
                startDate: { lt: requestedEndDate },
                endDate: { gt: requestedStartDate },
            }
        });

        if (conflictingBooking) {
            throw new BadRequestException('The user is already booked for this time slot');
        }

        const meetingUrl = dto.meetingUrl || `https://meet.jit.si/office-space-${generateId({ type: 'identifier' })}`;

        // Create the booking record
        const booking = await this.prisma.booking.create({
            data: {
                userId: user.id,
                hostId: dto.hostId,
                officeId: dto.officeId,
                startDate: requestedStartDate,
                endDate: requestedEndDate,
                title: dto.title,
                notes: dto.notes,
                timezone: dto.timezone,
                meetingUrl: meetingUrl,
            },
            include: {
                host: true,
                user: true
            }
        });

        [booking.host, booking.user].forEach((person) => {
            this.mailService
                .createBooking(
                    person.firstName,
                    person.email,
                    booking.title ?? 'New Booking',
                    booking.startDate.toISOString(),
                    booking.endDate.toISOString(),
                    booking.timezone ?? 'UTC',
                    booking.meetingUrl ?? 'N/A',
                    booking.notes ?? ''
                )
                .catch((err) => console.error(`Failed to send create booking email to ${person.email}:`, err));
        });

        return buildResponse({
            message: "booking successfully created",
            data: booking
        })
    }

    async getHostAvailability(options: GetHostAvailabilityDto) {
        const startOfDay = new Date(options.date);
        startOfDay.setUTCHours(0, 0, 0, 0);

        const endOfDay = new Date(options.date);
        endOfDay.setUTCHours(23, 59, 59, 999);

        const bookedSlots = await this.prisma.booking.findMany({
            where: {
                hostId: options.hostId,
                startDate: { gte: startOfDay },
                endDate: { lte: endOfDay },
            },
            select: {
                startDate: true,
                endDate: true,
            },
            orderBy: {
                startDate: 'asc'
            }
        });

        return buildResponse({
            message: "Host availability retrieved successfully",
            data: bookedSlots
        });
    }

    async updateBooking(user: User, bookingId: number, dto: UpdateBookingDto) {
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId }
        });

        if (!booking) {
            throw new NotFoundException('Booking not found');
        }

        if (booking.userId !== user.id && booking.hostId !== user.id) {
            throw new ForbiddenException('You are not authorized to update this booking');
        }

        const requestedStartDate = dto.startDate ? new Date(dto.startDate) : booking.startDate;
        const requestedEndDate = dto.endDate ? new Date(dto.endDate) : booking.endDate;

        if (dto.startDate || dto.endDate) {
            const now = new Date();
            if (requestedStartDate < now) {
                throw new BadRequestException('Cannot schedule a booking in the past');
            }

            if (requestedStartDate >= requestedEndDate) {
                throw new BadRequestException('End date must be after the start date');
            }

            const conflictingBooking = await this.prisma.booking.findFirst({
                where: {
                    id: { not: bookingId },
                    hostId: booking.hostId,
                    startDate: { lt: requestedEndDate },
                    endDate: { gt: requestedStartDate },
                }
            });

            if (conflictingBooking) {
                throw new BadRequestException('The host is already booked for this new time slot');
            }
        }

        const updatedBooking = await this.prisma.booking.update({
            where: { id: bookingId },
            data: {
                startDate: requestedStartDate,
                endDate: requestedEndDate,
                title: dto.title,
                notes: dto.notes,
            },
            include: {
                host: true,
                user: true
            }
        });

        [updatedBooking.host, updatedBooking.user].forEach((person) => {
            this.mailService
                .updateBooking(
                    person.firstName,
                    person.email,
                    updatedBooking.title ?? 'Updated Booking',
                    updatedBooking.startDate.toISOString(),
                    updatedBooking.endDate.toISOString(),
                    updatedBooking.notes ?? ''
                )
                .catch((err) => console.error(`Failed to send update booking email to ${person.email}:`, err));
        });

        return buildResponse({
            message: "Booking successfully updated",
            data: updatedBooking
        });
    }

    async fetchBooking(user: User, bookingId: number) {
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
            include: {
                host: true,
                user: true
            }
        });

        if (!booking) {
            throw new NotFoundException('Booking not found');
        }

        if (booking.userId !== user.id && booking.hostId !== user.id) {
            throw new ForbiddenException('You are not authorized to view this booking');
        }

        return buildResponse({
            message: "Booking retrieved successfully",
            data: booking
        });
    }
}