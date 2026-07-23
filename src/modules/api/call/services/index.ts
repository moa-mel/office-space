import { AIService } from "@/modules/api/ai/services";
import { PrismaService } from "@/modules/core/prisma/services";
import { generateId } from "@/utils";
import { forwardRef, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { CreateCallDto} from "../dtos";
import { buildResponse } from "@/utils/api-response-util";

@Injectable()
export class CallService {
    constructor(
        private prisma: PrismaService,

        @Inject(forwardRef(() => AIService))
        private aiService: AIService
    ) { }

    async createCall(officeId: number, dto: CreateCallDto): Promise<ApiResponse<Record<string, any>>> {
        const call = await this.prisma.call.create({
            data: {
                title: dto.title || 'New Call',
                officeId: officeId,
            }
        });

        return buildResponse({
            message: "Call successfully created",
            data: call
        })
    }

    async addParticipant(callId: string, userId: string): Promise<ApiResponse<Record<string, any>>> {
        const numericCallId = parseInt(callId, 10);
        const numericUserId = parseInt(userId, 10);

        const [call, user] = await Promise.all([
            this.prisma.call.findUnique({ where: { id: numericCallId } }),
            this.prisma.user.findUnique({ where: { id: numericUserId } })
        ]);

        if (!call) {
            throw new NotFoundException(`Call with ID ${callId} not found`);
        }

        if (!user) {
            throw new NotFoundException(`User with ID ${userId} not found`);
        }

        const add = await this.prisma.callParticipant.create({
            data: {
                callId: numericCallId,
                userId: numericUserId,
            }
        });

        return buildResponse({
            message: "Participant added successfully",
            data: add
        })
    }

    async removeParticipant(callId: string, userId: string): Promise<ApiResponse<Record<string, any>>> {
        const numericCallId = parseInt(callId, 10);
        const numericUserId = parseInt(userId, 10);
        const remove = await this.prisma.callParticipant.delete({
            where: {
                callId_userId: {
                    callId: numericCallId,
                    userId: numericUserId,
                }
            }
        });
        return buildResponse({
            message: "Participant successfully removed",
            data: remove
        })
    }

    async endCallWithSummary(callId: string): Promise<ApiResponse<Record<string, any>>> {
        const summary = await this.aiService.summarizeCall(callId);

        return buildResponse({
            message: "Call successfully summarized",
            data: { summary }
        })
    }

    async findCallById(callId: string) {
        const numericCallId = parseInt(callId, 10);
        const call = await this.prisma.call.findUnique({ where: { id: numericCallId } });
        if (!call) {
            throw new NotFoundException(`Call with ID ${callId} not found`);
        }

        return buildResponse({
            message: "Call successfully retrieved",
            data: call
        })
    }

    async fetchAllCall() {
        const calls = await this.prisma.call.findMany();
        return buildResponse({
            message: "Calls successfully retrieved",
            data: calls
        })
    }
}