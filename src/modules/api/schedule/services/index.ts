import { PrismaService } from "@/modules/core/prisma/services";
import { Injectable, Logger } from "@nestjs/common";
import { Cron } from '@nestjs/schedule';

@Injectable()
export class SchedulerService {
    private readonly logger = new Logger(SchedulerService.name);
    constructor(
        private prisma: PrismaService,
    ) { }

    @Cron('*/15 * * * *')
    async sendEventReminders() {
        this.logger.log('Runs every 15 minutes — sends reminders for events starting in 30 min');
        const soon = new Date(Date.now() + 30 * 60 * 1000);
        const events = await this.prisma.event.findMany({
            where: { startDate: { lte: soon, gte: new Date() } },
            include: { attendees: { include: { user: true } } },
        });
        for (const event of events) {
            this.logger.log(`Sending reminders for event: "${event.title}"`);
            for (const attendee of event.attendees) {
                // emit via WebSocket or push notification to attendee.user
                console.log(`  - Notifying ${attendee.user.email}`);
            }
        }
    }
}
