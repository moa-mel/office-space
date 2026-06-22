import { PrismaService } from "@/modules/core/prisma/services";
import { Injectable, InternalServerErrorException, Logger } from "@nestjs/common";
import OpenAI from "openai";

@Injectable()
export class AIService {

    private openai: OpenAI;

    private readonly logger = new Logger(AIService.name);
    constructor(private prisma: PrismaService) {
        this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }

    // Summarize a call transcript
    async summarizeCall(callId: string): Promise<string> {
        const call = await this.prisma.call.findUnique({ where: { id: callId } });
        if (!call?.transcript) return 'No transcript available.';

        try {
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                    { role: 'system', content: 'You are an AI assistant for a virtual office. Summarize meeting transcripts concisely: key decisions, action items, and next steps.' },
                    { role: 'user', content: `Summarize this meeting:\n\n${call.transcript}` },
                ],
            });

            const summary = response.choices[0].message.content ?? '';
            await this.prisma.call.update({ where: { id: callId }, data: { aiSummary: summary } });
            return summary;
        } catch (error) {
            this.logger.error(`Failed to summarize call ${callId}:`, error);
            throw new InternalServerErrorException('Failed to generate call summary.');
        }
    }

    // Parse a natural language scheduling request
    async parseSchedulingRequest(userId: string, message: string) {
        try {
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'system',
                        content: `You are a scheduling assistant for a virtual office. 
Today is ${new Date().toISOString()}.
Extract scheduling intent from the user's message and return JSON:
{ "action": "create_event" | "list_events" | "cancel_event" | "unknown",
  "title": string, "startTime": ISO string, "endTime": ISO string, "attendeeEmails": string[] }`,
                    },
                    { role: 'user', content: message },
                ],
                response_format: { type: 'json_object' },
            });

            const content = response.choices[0].message.content;
            return JSON.parse(content ?? '{}');
        } catch (error) {
            this.logger.error(`Failed to parse scheduling request for user ${userId}:`, error);
            throw new InternalServerErrorException('Failed to parse scheduling request.');
        }
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
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                    { role: 'system', content: `You are an AI engineer assistant in a virtual office platform. Help users manage their schedule, understand meeting context, and answer office-related questions.\n\nContext: ${context}` },
                    ...history as any,
                    { role: 'user', content: message },
                ],
            });

            return response.choices[0].message.content;
        } catch (error) {
            this.logger.error(`Failed to get chat response for user ${userId}:`, error);
            throw new InternalServerErrorException('Failed to get chat response.');
        }
    }

}