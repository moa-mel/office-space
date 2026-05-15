import { SubscribeMessage, WebSocketGateway, WebSocketServer, MessageBody, OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, ConnectedSocket, WsException } from '@nestjs/websockets'
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { timestamp } from 'rxjs';
import { ChatService } from '../services';
import { JwtService } from '@nestjs/jwt';
import { DataStoredInToken } from '../../auth/interfaces';
import { jwtSecret } from '../../../../config';
import logger from 'moment-logger';
import { JoinRoomDto, RoomMessageDto, TypingDto } from '../dtos';
import { PrismaService } from '@/modules/core/prisma/services';


@WebSocketGateway(3000,{cors: { origin: '*' } })
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    constructor(
        private readonly chatService: ChatService,
        private readonly jwtService: JwtService,
        private prisma: PrismaService
    ) { }

    private logger: Logger = new Logger('WebSocketGateway');
    @WebSocketServer() server: Server;

    private onlineUsers = new Map<number, number>();

    private typingCooldown = new Map<number, { timeout: NodeJS.Timeout; conversationId: string }>();

    afterInit(server: Server) {
        server.use(async (socket, next) => {
            try {
                const token =
                    socket.handshake.auth?.token ||
                    socket.handshake.headers?.authorization?.split(' ')[1];

                if (!token) {
                    return next(new Error('Unauthorized'));
                }

                const payload: DataStoredInToken = await this.jwtService.verifyAsync(
                    token,
                    {
                        secret: jwtSecret,
                    },
                );

                const user = await this.prisma.user.findUnique({
                    where: { identifier: payload.sub },
                });

                if (!user) {
                    return next(new Error('Unauthorized'));
                }

                socket.data.user = {
                    id: user.id,
                    email: user.email,
                };

                next();
            } catch (error) {
                this.logger.error(`WebSocket authentication failed: ${error instanceof Error ? error.message : String(error)}`);
                next(new Error('Unauthorized'));
            }
        });

        logger.log('WebSocket Gateway Initialized');
    }

    // Extract user info from JWT token if available
    async handleConnection(client: Socket) {
        logger.log('New user connected!', client.id);

        const user = client.data.user;
        if (!user) return;

        const count = this.onlineUsers.get(user.id) ?? 0;
        this.onlineUsers.set(user.id, count + 1);

        if (count === 0) {
            await this.broadcastPresence(user.id, true);
        }

        const conversations = await this.prisma.conversation.findMany({
            where: {
                participants: {
                    some: {
                        userId: user.id,
                    },
                },
            },
        });

        conversations.forEach(({ id }) => client.join(id))
    }

    async handleDisconnect(client: Socket) {
        const user = client.data.user;
        if (!user) return;

        const count = this.onlineUsers.get(user.id) ?? 0;

        if (count <= 1) {
            this.onlineUsers.delete(user.id);
            await this.broadcastPresence(user.id, false);
        } else {
            this.onlineUsers.set(user.id, count - 1);
        }

        if (this.typingCooldown.has(user.id)) {
            const { timeout, conversationId } = this.typingCooldown.get(user.id)!;
            clearTimeout(timeout);
            this.server.to(conversationId).emit('typing', {
                userId: user.id,
                isTyping: false
            });
            this.typingCooldown.delete(user.id);
        }

        client.removeAllListeners();
    }

    private async broadcastPresence(userId: number, isOnline: boolean) {
        const conversations = await this.prisma.participant.findMany({
            where: { userId },
            select: { conversationId: true },
        });

        conversations.forEach(({ conversationId }) => {
            this.server.to(conversationId).emit('presence', {
                userId,
                isOnline,
            });
        });
    }

    @SubscribeMessage('joinRoom')
    async handleJoinRoom(
        @MessageBody() dto: JoinRoomDto,
        @ConnectedSocket() client: Socket,
    ) {
        const user = client.data.user;

        const isMember = await this.prisma.participant.findUnique({
            where: {
                conversationId_userId: {
                    conversationId: dto.conversationId,
                    userId: user.id,
                },
            },
        });

        if (!isMember) {
            throw new WsException('Unauthorized');
        }

        client.join(dto.conversationId);

        return {
            conversationId: dto.conversationId,
            joined: true,
        };
    }

    @SubscribeMessage('roomMessage')
    async handleRoomMessage(
        @MessageBody() dto: RoomMessageDto,
        @ConnectedSocket() client: Socket,
    ) {
        const user = client.data.user;

        if (!client.rooms.has(dto.conversationId)) {
            throw new WsException('Not in room');
        }

        const message = await this.chatService.sendMessage(user, dto);

        this.server.to(dto.conversationId).emit('roomMessage', {
            id: message.id,
            conversationId: dto.conversationId,
            content: message.content,
            type: message.type,
            mediaUrl: message.mediaUrl,
            mediaType: message.mediaType,
            from: {
                id: user.id,
                email: user.email,
            },
            createdAt: message.createdAt,
        });
    }

    @SubscribeMessage('typing')
    async handleStartTyping(
        @MessageBody() dto: TypingDto,
        @ConnectedSocket() client: Socket,
    ) {
        const user = client.data.user;

        if (!client.rooms.has(dto.conversationId)) {
            throw new WsException('Not in room');
        }

        if (this.typingCooldown.has(user.id)) {
            clearTimeout(this.typingCooldown.get(user.id)!.timeout);
        }

        client.broadcast.to(dto.conversationId).emit('typing', {
            userId: user.id,
            isTyping: true
        });

        const timeout = setTimeout(() => {
            this.server.to(dto.conversationId).emit('typing', {
                userId: user.id,
                isTyping: false
            });
            this.typingCooldown.delete(user.id);
        }, 3000);

        this.typingCooldown.set(user.id, { timeout, conversationId: dto.conversationId });
    }



    //io.emit = broadcast message
    // socket.emit = send to specific clients
    // client.broadcast.emit = send to all clients except the one that sent the message 
    // this.server.emit = send to all clients
}