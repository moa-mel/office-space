import { HttpException } from '@nestjs/common';

export class JoinChatError extends HttpException {
  name = 'JoinChatError';
}

export class InvalidConversationIdException extends HttpException {
  name = 'InvalidConversationIdException';
}

export class InvalidMessageId extends HttpException {
  name = 'InvalidMessageId';
}