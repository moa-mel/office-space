// src/calls/calls.gateway.ts
import {
  WebSocketGateway, WebSocketServer,
  SubscribeMessage, MessageBody, ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { CallService } from '../services';

@WebSocketGateway({ cors: true, namespace: '/calls' })
export class CallsGateway {
  @WebSocketServer() server: Server;

  constructor(private callsService: CallService) {}

  @SubscribeMessage('join-room')
  async handleJoinRoom(
    @MessageBody() data: { roomId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(data.roomId);
    await this.callsService.addParticipant(data.roomId, data.userId);
    client.to(data.roomId).emit('user-joined', { userId: data.userId });
  }

  @SubscribeMessage('leave-room')
  async handleLeaveRoom(
    @MessageBody() data: { roomId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(data.roomId);
    await this.callsService.removeParticipant(data.roomId, data.userId);
    client.to(data.roomId).emit('user-left', { userId: data.userId });
  }

  @SubscribeMessage('webrtc-signal')
  handleSignal(
    @MessageBody() data: { roomId: string; signal: any; targetUserId: string },
    @ConnectedSocket() client: Socket,
  ) {
    // Forward WebRTC signaling (offer/answer/ICE candidates)
    this.server.to(data.roomId).emit('webrtc-signal', {
      signal: data.signal,
      fromSocketId: client.id,
    });
  }

  @SubscribeMessage('end-call')
  async handleEndCall(@MessageBody() data: { callId: string }) {
    const summary = await this.callsService.endCallWithSummary(data.callId);
    this.server.to(data.callId).emit('call-ended', { summary });
  }
}