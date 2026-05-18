import { PrismaService } from "@/modules/core/prisma/services";
import {
    JoinChatDto,
    RoomMessageDto,
    FetchMessagesDto,
    CreateChannelDto,
    AddChannelMemberDto,
    UpdateChannelInfoDto,
    GetEligibleMembersDto,
    MessageReadDto,
    ConversationFilterDto
} from "../dtos";
import { InvalidConversationIdException } from "../errors";
import { ConversationType, MessageType, Prisma, User } from "@prisma/client";
import { JoinChatError } from "../errors";
import { HttpStatus, BadRequestException, Injectable, ForbiddenException, NotFoundException } from "@nestjs/common";
import { buildResponse } from "@/utils/api-response-util";
import { WsException } from "@nestjs/websockets";
import { generateId } from "@/utils";

@Injectable()
export class ChatService {
    constructor(
        private prisma: PrismaService,
    ) { }

    async startChat(user: User, options: JoinChatDto) {
        if (user.id === options.userId) {
            throw new JoinChatError('User cannot chat with self', HttpStatus.BAD_REQUEST)
        }

        // Find a common office between the two users
        const commonOffice = await this.prisma.officeMember.findFirst({
            where: {
                userId: user.id,
                office: {
                    members: {
                        some: {
                            userId: options.userId
                        }
                    }
                }
            }
        });

        if (!commonOffice) {
            throw new JoinChatError('Users must share an office to start a chat', HttpStatus.BAD_REQUEST);
        }

        const existingChat = await this.prisma.conversation.findFirst({
            where: {
                type: ConversationType.DIRECT,
                officeId: commonOffice.officeId,
                participants: {
                    every: {
                        userId: {
                            in: [user.id, options.userId]
                        }
                    }
                }
            },
            include: {
                participants: true
            }
        });

        // Check if both users are participants
        if (existingChat && existingChat.participants.length === 2) {
            const participantIds = existingChat.participants.map(p => p.userId);
            if (participantIds.includes(user.id) && participantIds.includes(options.userId)) {
                return buildResponse({
                    message: 'Chat started successfully',
                    data: {
                        conversationId: existingChat.id
                    }
                });
            }
        }

        const conversation = await this.prisma.conversation.create({
            data: {
                type: ConversationType.DIRECT,
                officeId: commonOffice.officeId
            }
        });

        const participants = await this.prisma.participant.createMany({
            data: [
                {
                    conversationId: conversation.id,
                    userId: user.id
                },
                {
                    conversationId: conversation.id,
                    userId: options.userId
                }
            ]
        });

        return buildResponse({
            message: 'Chat started successfully',
            data: {
                conversationId: conversation.id,
                participants: [user.id, options.userId]
            }
        })
    }

    async sendMessage(user: User, options: RoomMessageDto) {
        const conversation = await this.prisma.conversation.findUnique({
            where: {
                id: options.conversationId,
            },
        });

        if (!conversation) {
            throw new WsException('Conversation id is invalid.');
        }

        if (options.type === MessageType.TEXT && !options.message) {
            throw new WsException('Text message cannot be empty');
        }

        if (options.type !== MessageType.TEXT && !options.media) {
            throw new WsException('Media is required for this message type');
        }

        const isMember = await this.prisma.participant.findUnique({
            where: {
                conversationId_userId: {
                    conversationId: options.conversationId,
                    userId: user.id,
                },
            },
        });

        if (!isMember) {
            throw new WsException('User is not a participant of this conversation');
        }

        const message = await this.prisma.message.create({
            data: {
                conversationId: conversation.id,
                senderId: user.id,
                content: options.message || '',
                type: options.type,
                mediaUrl: options.media?.url || undefined,
                mediaType: options.media?.mimeType || undefined,
                mediaId: options.media?.id || undefined,
            },
        });

        const lastMessagePreview =
            options.type === MessageType.TEXT
                ? options.message
                : options.message
                    ? options.message
                    : 'Media message';

        await this.prisma.conversationMeta.upsert({
            where: { conversationId: conversation.id },
            update: {
                lastMessage: lastMessagePreview,
                lastMessageAt: new Date(),
                lastSenderId: user.id,
            },
            create: {
                conversationId: conversation.id,
                lastMessage: lastMessagePreview,
                lastMessageAt: new Date(),
                lastSenderId: user.id,
            },
        });

        return message;
    }

    async fetchMessage(user: User, options: FetchMessagesDto) {
        const conversation = await this.prisma.conversation.findUnique({
            where: {
                id: options.conversationId,
            },
        });

        if (!conversation) {
            throw new InvalidConversationIdException(
                'Conversation id is invalid.',
                HttpStatus.BAD_REQUEST,
            );
        }

        const isMember = await this.prisma.participant.findUnique({
            where: {
                conversationId_userId: {
                    conversationId: options.conversationId,
                    userId: user.id,
                },
            },
        });

        if (!isMember) {
            throw new InvalidConversationIdException(
                'User is not a participant of this conversation',
                HttpStatus.FORBIDDEN,
            );
        }

        const whereClause: any = {
            conversationId: conversation.id,
            NOT: {
                deletedFor: {
                    has: user.id
                }
            }
        };

        if (options.lastMessageId) {
            const lastMessage = await this.prisma.message.findUnique({
                where: { id: options.lastMessageId },
            });

            if (lastMessage) {
                whereClause.createdAt = {
                    lt: lastMessage.createdAt
                };
            }
        }

        const messages = await this.prisma.message.findMany({
            where: whereClause,
            orderBy: {
                createdAt: 'desc'
            },
            take: 20,
            include: {
                messageReads: true
            }
        });

        await this.markConversationAsRead(user, {
            conversationId: conversation.id,
            lastMessageId: messages[messages.length - 1]?.id,
        });

        return buildResponse({
            message: 'Messages fetched successfully.',
            data: {
                messages,
                oldestMessageId: messages[messages.length - 1]?.id || null,
            },
        });
    }

    async createChannel(user: User, dto: CreateChannelDto) {
        return this.prisma.$transaction(async (tx) => {
            const userOffice = await tx.officeMember.findUnique({
                where: { officeId_userId: { officeId: dto.officeId, userId: user.id } },
                select: { officeId: true }
            });

            if (!userOffice) {
                throw new BadRequestException('User must be a member of the specified office to create a group');
            }

            const conversation = await tx.conversation.create({
                data: {
                    type: ConversationType.GROUP,
                    name: dto.name,
                    officeId: dto.officeId,
                },
            });

            const uniqueParticipantIds = Array.from(
                new Set([user.id, ...(dto.participantIds || [])]),
            );

            const participants = await tx.participant.createMany({
                data: uniqueParticipantIds.map((id) => ({
                    conversationId: conversation.id,
                    userId: id,
                })),
            });

            return buildResponse({
                message: 'Group created successfully',
                data: conversation,
            });
        });
    }

    async addChannelMember(conversationId: string, user: User, options: AddChannelMemberDto) {
        const conversation = await this.prisma.conversation.findFirst({
            where: {
                id: conversationId,
                type: ConversationType.GROUP,
            },
        });

        if (!conversation) {
            throw new InvalidConversationIdException(
                'Conversation not found',
                HttpStatus.NOT_FOUND,
            );
        }

        const existingParticipants = await this.prisma.participant.findMany({
            where: {
                conversationId: conversationId,
                userId: {
                    in: options.participantIds,
                },
            },
            select: {
                userId: true,
            },
        });

        const existingParticipantIds = existingParticipants.map(p => p.userId);
        const newParticipantIds = options.participantIds.filter(
            id => !existingParticipantIds.includes(id)
        );

        if (newParticipantIds.length === 0) {
            throw new BadRequestException(
                'All specified users are already members of this group',
            );
        }

        // Ensure all new participants actually belong to the office
        const validOfficeMembers = await this.prisma.officeMember.findMany({
            where: {
                officeId: conversation.officeId,
                userId: { in: newParticipantIds },
            },
        });

        if (validOfficeMembers.length !== newParticipantIds.length) {
            throw new BadRequestException('All invited users must be members of the office');
        }

        await this.prisma.participant.createMany({
            data: newParticipantIds.map((id) => ({
                conversationId: conversation.id,
                userId: id,
            })),
        });

        return buildResponse({
            message: 'Group members successfully added',
            data: {
                conversationId: conversation.id,
                addedParticipantIds: newParticipantIds,
            },
        });
    }

    async updateChannelInfo(conversationId: string, user: User, options: UpdateChannelInfoDto) {
        const conversation = await this.prisma.conversation.findFirst({
            where: {
                id: conversationId,
                type: ConversationType.GROUP,
            },
        });

        if (!conversation) {
            throw new InvalidConversationIdException(
                'Conversation not found',
                HttpStatus.NOT_FOUND,
            );
        }

        const updateData: { name?: string; imageUrl?: string } = {};
        if (options.name) updateData.name = options.name;
        if (options.imageUrl) updateData.imageUrl = options.imageUrl;

        await this.prisma.conversation.update({
            where: { id: conversationId },
            data: updateData,
        });

        const updatedConversation = await this.prisma.conversation.findUnique({
            where: { id: conversationId },
            select: {
                id: true,
                name: true,
                imageUrl: true,
            },
        });

        if (!updatedConversation) {
            throw new InvalidConversationIdException(
                'Conversation not found after update',
                HttpStatus.NOT_FOUND,
            );
        }

        return buildResponse({
            message: 'Channel Info updated successfully',
            data: updatedConversation,
        });
    }

    async getMediaPreview(user: User, options: FetchMessagesDto) {
        const isMember = await this.prisma.participant.findUnique({
            where: {
                conversationId_userId: {
                    conversationId: options.conversationId,
                    userId: user.id,
                },
            },
        });

        if (!isMember) {
            throw new ForbiddenException(
                'User is not a participant of this conversation',
            );
        }

        const whereClause: Prisma.MessageWhereInput = {
            conversationId: options.conversationId,
            mediaUrl: {
                not: null,
            },
            NOT: {
                deletedFor: {
                    has: user.id,
                },
            },
        };

        if (options.lastMessageId) {
            const lastMessage = await this.prisma.message.findUnique({
                where: { id: options.lastMessageId },
            });

            if (lastMessage) {
                whereClause.createdAt = {
                    lt: lastMessage.createdAt,
                };
            }
        }

        const mediaMessages = await this.prisma.message.findMany({
            where: whereClause,
            orderBy: {
                createdAt: 'desc',
            },
            take: 20,
            select: {
                id: true,
                mediaUrl: true,
                mediaType: true,
                createdAt: true,
                senderId: true,
            },
        });

        return buildResponse({
            message: 'Media preview fetched successfully.',
            data: {
                media: mediaMessages,
                oldestMessageId: mediaMessages[mediaMessages.length - 1]?.id || null,
            },
        });
    }

    async downloadMessageMedia(user: User, messageId: number) {
        const message = await this.prisma.message.findUnique({
            where: { id: messageId },
            include: {
                conversation: {
                    select: {
                        participants: {
                            where: { userId: user.id },
                            select: { userId: true }
                        }
                    }
                }
            }
        });

        if (!message) {
            throw new NotFoundException('Message not found');
        }

        if (message.conversation.participants.length === 0) {
            throw new ForbiddenException('You are not authorized to download this media.');
        }

        if (!message.mediaUrl || !message.mediaType) {
            throw new BadRequestException('Message does not contain downloadable media.');
        }

        return {
            url: message.mediaUrl,
            mimeType: message.mediaType,
        };
    }


    async getEligibleMembersForNewChannel(user: User, dto: GetEligibleMembersDto) {
        const { search } = dto;

        // Simplified implementation - get users from same offices as current user
        const userOffices = await this.prisma.officeMember.findMany({
            where: { userId: user.id },
            select: { officeId: true }
        });

        const officeIds = userOffices.map(uo => uo.officeId);

        let whereClause: any = {
            id: { not: user.id },
            officeMembers: {
                some: {
                    officeId: { in: officeIds }
                }
            }
        };

        if (search) {
            whereClause.OR = [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
            ];
        }

        const members = await this.prisma.user.findMany({
            where: whereClause,
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
            }
        });

        return buildResponse({
            message: 'Eligible members fetched successfully.',
            data: { members },
        });
    }

    async markConversationAsRead(user: User, dto: MessageReadDto) {
        await this.prisma.$transaction(async (tx) => {
            const messages = await tx.message.findMany({
                where: {
                    conversationId: dto.conversationId,
                    senderId: { not: user.id },
                    id: { lte: dto.lastMessageId },
                },
                select: { id: true },
            });

            if (!messages.length) return;

            await tx.messageRead.createMany({
                data: messages.map((m) => ({
                    messageId: m.id,
                    userId: user.id,
                })),
                skipDuplicates: true,
            });
        });
    }

    async getConversationList(user: User, filter: ConversationFilterDto) {
        const whereClause: any = {
            participants: {
                some: {
                    userId: user.id
                }
            }
        };

        if (filter?.type) {
            whereClause.type = filter.type;
        }

        const conversations = await this.prisma.conversation.findMany({
            where: whereClause,
            include: {
                participants: {
                    include: {
                        user: true
                    }
                },
                meta: true
            },
            orderBy: {
                meta: {
                    lastMessageAt: 'desc'
                }
            }
        });

        // Get unread counts for each conversation
        const formatted = await Promise.all(conversations.map(async (conversation) => {
            const unreadCount = await this.prisma.message.count({
                where: {
                    conversationId: conversation.id,
                    senderId: { not: user.id },
                    messageReads: {
                        none: {
                            userId: user.id
                        }
                    }
                }
            });

            const participants = conversation.participants.map(p => p.user);
            const isGroup = conversation.type === ConversationType.GROUP;

            return {
                conversationId: conversation.id,
                type: conversation.type,
                user: !isGroup ? participants.find((u) => u.id !== user.id) : null,
                name: isGroup ? conversation.name : null,
                participants: participants,
                lastMessage: conversation.meta?.lastMessage ?? null,
                lastMessageAt: conversation.meta?.lastMessageAt ?? null,
                unreadCount,
            };
        }));

        return buildResponse({
            message: 'Conversations fetched successfully.',
            data: formatted,
        });
    }

}