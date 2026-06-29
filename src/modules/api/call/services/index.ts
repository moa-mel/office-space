import { AIService } from "@/modules/api/ai/services";
import { PrismaService } from "@/modules/core/prisma/services";
import { generateId } from "@/utils";
import { Injectable, NotFoundException } from "@nestjs/common";
import { CreateCallDto } from "../dtos";

@Injectable()
export class CallService {
    constructor(
        private prisma: PrismaService,
        private aiService: AIService,
    ) { }

    async createCall(officeId: number, dto: CreateCallDto) {
        const call = await this.prisma.call.create({
            data: {
                id: generateId({ type: 'identifier' }),
                title: dto.title || 'New Call',
                officeId: officeId,
            }
        });
        return call;
    }

    async addParticipant(roomId: string, userId: string): Promise<void> {
        const numericUserId = parseInt(userId, 10);
        await this.prisma.callParticipant.create({
            data: {
                callId: roomId,
                userId: numericUserId,
            }
        });
    }

    async removeParticipant(roomId: string, userId: string): Promise<void> {
        const numericUserId = parseInt(userId, 10);
        await this.prisma.callParticipant.delete({
            where: {
                callId_userId: {
                    callId: roomId,
                    userId: numericUserId,
                }
            }
        });
    }

    async endCallWithSummary(callId: string): Promise<string> {
        const summary = await this.aiService.summarizeCall(callId);
        return summary;
    }

    async findCallById(callId: string) {
        const call = await this.prisma.call.findUnique({ where: { id: callId } });
        if (!call) {
            throw new NotFoundException(`Call with ID ${callId} not found`);
        }
        return call;
    }

    async fetchAllCall() {
        return this.prisma.call.findMany();
    }
}