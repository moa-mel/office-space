import { AIService } from "@/modules/api/ai/services";
import { BadRequestException, ForbiddenException, forwardRef, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@/modules/core/prisma/services";
import { buildResponse } from "@/utils/api-response-util";
import { MailService } from "@/mail/mail.service";
import { generateId } from "@/utils";
import { User } from "@prisma/client";
import { CreateEventDto, GetHostAvailabilityDto, UpdateEventDto } from "../dtos";
import { CallService } from "../../call/services";

@Injectable()
export class EventService {
    constructor(
        private prisma: PrismaService,
        private mailService: MailService,

        @Inject(forwardRef(() => AIService)) 
        private readonly aiService: AIService,
    ) { }

    async createEvent(user: User, officeId: number, dto: CreateEventDto) {
        const requestedStartDate = new Date(`${dto.startDate}T${dto.startTime}:00`);
        const requestedEndDate = new Date(`${dto.endDate}T${dto.endTime}:00`);

        const now = new Date();
        if (requestedStartDate < now) {
            throw new BadRequestException('Cannot schedule a Event in the past');
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

        const conflictingEvent = await this.prisma.event.findFirst({
            where: {
                hostId: dto.hostId,
                startDate: { lt: requestedEndDate },
                endDate: { gt: requestedStartDate },
            }
        });

        if (conflictingEvent) {
            throw new BadRequestException('The user is already booked for this time slot');
        }

        const meetingUrl = `https://meet.jit.si/office-space-${generateId({ type: 'identifier' })}`;

        const attendeesToCreate = [{ userId: user.id }];
        if (user.id !== dto.hostId) {
            attendeesToCreate.push({ userId: dto.hostId });
        }

        // Create the Event record
        const Event = await this.prisma.event.create({
            data: {
                userId: user.id,
                hostId: dto.hostId,
                officeId: officeId,
                startDate: requestedStartDate,
                endDate: requestedEndDate,
                title: dto.title,
                notes: dto.notes,
                timezone: dto.timezone,
                meetingUrl: meetingUrl,
                attendees: {
                    create: attendeesToCreate
                }
            },
            include: {
                host: true,
                user: true,
                attendees: {
                    include: {
                        user: true
                    }
                }
            }
        });

        [Event.host, Event.user].forEach((person) => {
            this.mailService
                .createEvent(
                    person.firstName,
                    person.email,
                    Event.title ?? 'New Event',
                    Event.startDate.toISOString(),
                    Event.endDate.toISOString(),
                    Event.timezone ?? 'UTC',
                    Event.meetingUrl ?? 'N/A',
                    Event.notes ?? ''
                )
                .catch((err) => console.error(`Failed to send create Event email to ${person.email}:`, err));
        });

        return buildResponse({
            message: "Event successfully created",
            data: Event
        })
    }

    async getHostAvailability(options: GetHostAvailabilityDto) {
        const startOfDay = new Date(options.date);
        startOfDay.setUTCHours(0, 0, 0, 0);

        const endOfDay = new Date(options.date);
        endOfDay.setUTCHours(23, 59, 59, 999);

        const bookedSlots = await this.prisma.event.findMany({
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

    async updateEvent(user: User, EventId: number, dto: UpdateEventDto) {
        const Event = await this.prisma.event.findUnique({
            where: { id: EventId }
        });

        if (!Event) {
            throw new NotFoundException('Event not found');
        }

        if (Event.userId !== user.id && Event.hostId !== user.id) {
            throw new ForbiddenException('You are not authorized to update this Event');
        }

        let requestedStartDate = Event.startDate;
        let requestedEndDate = Event.endDate;

        const hasDateOrTimeChanged = dto.startDate || dto.startTime || dto.endDate || dto.endTime;

        if (hasDateOrTimeChanged) {
            const newStartDateStr = dto.startDate || Event.startDate.toISOString().split('T')[0];
            const newStartTimeStr = dto.startTime || Event.startDate.toISOString().split('T')[1].substring(0, 5);
            const newEndDateStr = dto.endDate || Event.endDate.toISOString().split('T')[0];
            const newEndTimeStr = dto.endTime || Event.endDate.toISOString().split('T')[1].substring(0, 5);

            requestedStartDate = new Date(`${newStartDateStr}T${newStartTimeStr}:00`);
            requestedEndDate = new Date(`${newEndDateStr}T${newEndTimeStr}:00`);


            const now = new Date();
            if (requestedStartDate < now) {
                throw new BadRequestException('Cannot schedule a Event in the past');
            }

            if (requestedStartDate >= requestedEndDate) {
                throw new BadRequestException('End date must be after the start date');
            }

            const conflictingEvent = await this.prisma.event.findFirst({
                where: {
                    id: { not: EventId },
                    hostId: Event.hostId,
                    startDate: { lt: requestedEndDate },
                    endDate: { gt: requestedStartDate },
                }
            });

            if (conflictingEvent) {
                throw new BadRequestException('The host is already booked for this new time slot');
            }
        }

        const updatedEvent = await this.prisma.event.update({
            where: { id: EventId },
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

        [updatedEvent.host, updatedEvent.user].forEach((person) => {
            this.mailService
                .updateEvent(
                    person.firstName,
                    person.email,
                    updatedEvent.title ?? 'Updated Event',
                    updatedEvent.startDate.toISOString(),
                    updatedEvent.endDate.toISOString(),
                    updatedEvent.notes ?? ''
                )
                .catch((err) => console.error(`Failed to send update Event email to ${person.email}:`, err));
        });

        return buildResponse({
            message: "Event successfully updated",
            data: updatedEvent
        });
    }

    async fetchEvent(user: User, EventId: number) {
        const Event = await this.prisma.event.findUnique({
            where: { id: EventId },
            include: {
                host: true,
                user: true
            }
        });

        if (!Event) {
            throw new NotFoundException('Event not found');
        }

        if (Event.userId !== user.id && Event.hostId !== user.id) {
            throw new ForbiddenException('You are not authorized to view this Event');
        }

        return buildResponse({
            message: "Event retrieved successfully",
            data: Event
        });
    }
}