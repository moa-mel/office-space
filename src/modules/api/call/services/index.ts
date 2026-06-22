import { AIService } from "@/modules/api/ai/services";
import { PrismaService } from "@/modules/core/prisma/services";
import { Injectable, NotFoundException } from "@nestjs/common";

@Injectable()
export class CallService {
    constructor(
        private prisma: PrismaService,
        private aiService: AIService,
    ) { }

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

    async findOne(callId: string) {
        const call = await this.prisma.call.findUnique({ where: { id: callId } });
        if (!call) {
            throw new NotFoundException(`Call with ID ${callId} not found`);
        }
        return call;
    }
}