import { PrismaService } from "@/modules/core/prisma/services";
import { BadRequestException, forwardRef, Inject, Injectable, InternalServerErrorException, Logger, NotFoundException } from "@nestjs/common";
import { ParseSchedulingRequestDto } from "../dtos";
import { EventService } from "../../event/services";
import { CallService } from "../../call/services";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

@Injectable()
export class AIService {

    private readonly logger = new Logger(AIService.name);
    private genAI: GoogleGenerativeAI;
    constructor(
        private prisma: PrismaService, 
        @Inject(forwardRef(() => EventService))
        private eventService: EventService,
        
        @Inject(forwardRef(() => CallService))
        private callService: CallService,) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            this.logger.error('GEMINI_API_KEY is not set in environment variables.');
            throw new InternalServerErrorException('AI Service is not configured properly.');
        }
        this.genAI = new GoogleGenerativeAI(apiKey);
    }

    // Summarize a call transcript
    async summarizeCall(callId: string): Promise<string> {
        const call = await this.prisma.call.findUnique({ where: { id: callId } });
        if (!call?.transcript) return 'No transcript available.';

        try {
            const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const prompt = `You are an AI assistant for a virtual office. Summarize meeting transcripts concisely: key decisions, action items, and next steps.

Summarize this meeting:

${call.transcript}`;

            const result = await model.generateContent(prompt);
            const response = result.response;
            const summary = response.text();
            await this.prisma.call.update({ where: { id: callId }, data: { aiSummary: summary } });
            return summary;
        } catch (error) {
            this.logger.error(`Failed to summarize call ${callId}:`, error);
            throw new InternalServerErrorException('Failed to generate call summary.');
        }
    }

    // Parse a natural language scheduling request
    async parseSchedulingRequest(options: ParseSchedulingRequestDto) {
        try {
            const model = this.genAI.getGenerativeModel({
                model: "gemini-1.5-flash",
                generationConfig: { responseMimeType: "application/json" },
            });
            const prompt = `You are a scheduling assistant for a virtual office.
                           Today is ${new Date().toISOString()}.
                           Extract scheduling intent from the user's message and return JSON:
                           { "action": "create_event" | "create_call" | "list_events" | "cancel_event" | "unknown", "title": string, "startTime": ISO string, "endTime": ISO string, "attendeeEmails"?: string[] }. If attendeeEmails are not mentioned, do not include the field.
                           
User message: "${options.message}"`;

            const result = await model.generateContent(prompt);
            const response = result.response;
            const content = response.text();
            return JSON.parse(content);
        } catch (error) {
            this.logger.error(`Failed to parse scheduling request for user ${options.userId}:`, error);
            throw new InternalServerErrorException('Failed to parse scheduling request.');
        }
    }

    async handleParseSchedulingRequest(dto: ParseSchedulingRequestDto) {
        const parsedRequest = await this.parseSchedulingRequest(dto);

        const isImmediate = (startTime: string) => {
            if (!startTime) return false;
            return new Date(startTime).getTime() - new Date().getTime() < 2 * 60 * 1000; // within 2 minutes
        };

        if (parsedRequest.action === 'create_event') {
            const requester = await this.prisma.user.findUnique({ where: { id: dto.userId } });
            if (!requester) {
                throw new NotFoundException(`User with ID ${dto.userId} not found`);
            }

            if (!parsedRequest.attendeeEmails || parsedRequest.attendeeEmails.length === 0) {
                throw new BadRequestException("No attendees found in the request.");
            }

            const hostEmail = parsedRequest.attendeeEmails.find(email => email !== requester.email);
            if (!hostEmail) {
                throw new BadRequestException("Could not determine a host for the event.");
            }

            const host = await this.prisma.user.findUnique({ where: { email: hostEmail } });
            if (!host) {
                throw new NotFoundException(`Host with email ${hostEmail} not found`);
            }

            const createEventDto = {
                hostId: host.id,
                title: parsedRequest.title,
                startDate: new Date(parsedRequest.startTime),
                endDate: new Date(parsedRequest.endTime),
            };

            const requesterOffices = await this.prisma.officeMember.findMany({ where: { userId: requester.id }, select: { officeId: true } });
            const hostOffices = await this.prisma.officeMember.findMany({ where: { userId: host.id }, select: { officeId: true } });

            const requesterOfficeIds = new Set(requesterOffices.map(o => o.officeId));
            const commonOffice = hostOffices.find(o => requesterOfficeIds.has(o.officeId));

            if (!commonOffice) {
                throw new BadRequestException("Requester and host are not in the same office.");
            }

            return this.eventService.createEvent(requester, commonOffice.officeId, createEventDto);
        } else if (parsedRequest.action === 'create_call') {
            const requester = await this.prisma.user.findUnique({ where: { id: dto.userId } });
            if (!requester) {
                throw new NotFoundException(`User with ID ${dto.userId} not found`);
            }

            if (isImmediate(parsedRequest.startTime)) {
                const requesterOffices = await this.prisma.officeMember.findMany({ where: { userId: requester.id } });
                if (requesterOffices.length === 0) {
                    throw new BadRequestException("User is not a member of any office.");
                }
                // Assuming the first office if the user is in multiple offices for an immediate call.
                // A more sophisticated approach might be needed if a user can belong to multiple offices.
                const officeId = requesterOffices[0].officeId;

                // Immediate call
                const call = await this.callService.createCall(officeId, { title: parsedRequest.title });
                // For now, we just return the call object. In a real-world scenario,
                // you'd handle participant notifications here.
                return {
                    message: "Immediate call created. You can join now.",
                    call,
                    meetingUrl: `https://meet.jit.si/office-space-${call.id}`
                };
            } else {
                // Scheduled call (create an event)
                const hostEmail = parsedRequest.attendeeEmails?.find(email => email !== requester.email);
                if (!hostEmail) throw new BadRequestException("Could not determine a host for the event.");
                const host = await this.prisma.user.findUnique({ where: { email: hostEmail } });
                if (!host) throw new NotFoundException(`Host with email ${hostEmail} not found`);

                const requesterOffices = await this.prisma.officeMember.findMany({ where: { userId: requester.id }, select: { officeId: true } });
                const hostOffices = await this.prisma.officeMember.findMany({ where: { userId: host.id }, select: { officeId: true } });

                const requesterOfficeIds = new Set(requesterOffices.map(o => o.officeId));
                const commonOffice = hostOffices.find(o => requesterOfficeIds.has(o.officeId));

                if (!commonOffice) {
                    throw new BadRequestException("Requester and host are not in the same office.");
                }


                return this.eventService.createEvent(requester, commonOffice.officeId, {
                    hostId: host.id,
                    title: parsedRequest.title,
                    startDate: new Date(parsedRequest.startTime),
                    endDate: new Date(parsedRequest.endTime),
                });
            }
        }

        return parsedRequest;
    }

    // General AI assistant for the office
    async chat(userId: string, message: string, history: { role: string; content: string }[]) {
        const numericUserId = parseInt(userId, 10);
        const userEvents = await this.prisma.event.findMany({
            where: { attendees: { some: { userId: numericUserId } }, startDate: { gte: new Date() } },
            take: 5,
        });

        const context = userEvents.length
            ? `User's upcoming events: ${JSON.stringify(userEvents.map(e => ({ title: e.title, startTime: e.startDate })))}`
            : 'User has no upcoming events.';

        try {
            const model = this.genAI.getGenerativeModel({
                model: "gemini-1.5-flash",
                systemInstruction: `You are an AI engineer assistant in a virtual office platform. Help users manage their schedule, understand meeting context, and answer office-related questions.\n\nContext: ${context}`,
                safetySettings: [
                    {
                        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
                    },
                ]
            });

            const chat = model.startChat({
                history: history.map(h => ({
                    role: h.role === 'user' ? 'user' : 'model', // Gemini uses 'user' and 'model'
                    parts: [{ text: h.content }]
                }))
            });

            const result = await chat.sendMessage(message);
            const response = result.response;
            return response.text();
        } catch (error) {
            this.logger.error(`Failed to get chat response for user ${userId}:`, error);
            throw new InternalServerErrorException('Failed to get chat response.');
        }
    }

}