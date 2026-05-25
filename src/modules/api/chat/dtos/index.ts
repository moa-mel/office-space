import { ConversationType, MessageType } from "@prisma/client";
import { Type } from "class-transformer";
import { ArrayNotEmpty, IsArray, IsDate, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUrl, IsUUID, MaxLength, ValidateIf, ValidateNested } from "class-validator";


export enum DeletionType {
  ME = 'me',
  EVERYONE = 'everyone',
}

export class JoinRoomDto {
  @IsUUID()
  conversationId: string;
}

export class JoinChatDto {
  @IsNumber()
  userId: number;
}

export class MessageMediaDto {
  @IsUrl()
  url: string;

  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @IsString()
  @IsNotEmpty()
  id: string;
}

export class RoomMessageDto {
  @IsUUID()
  conversationId: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;

  @IsEnum(MessageType)
  type: MessageType;

  @ValidateIf((dto) => dto.type !== MessageType.TEXT)
  @ValidateNested()
  @Type(() => MessageMediaDto)
  media?: MessageMediaDto;

  @IsNumber()
  userId: number;
}

export class TypingDto {
  @IsUUID()
  conversationId: string;
}

export class MessageReadDto {
  @IsUUID()
  conversationId: string;

  @IsNumber()
  lastMessageId: number;
}

export class FetchMessagesDto {
  @IsUUID()
  conversationId: string;

  @IsNumber()
  @IsOptional()
  lastMessageId?: number;
}

export class FetchConversationDto {
  @IsOptional()
  @IsString()
  name?: string;
}

export class DeleteMessageDto {
  @Type(() => Number)
  @IsNumber()
  messageId: number;

  @IsEnum(DeletionType)
  type: DeletionType;

  @IsUUID()
  conversationId: string;
}

export class CreateChannelDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  participantIds?: number[];

  @IsNumber()
  officeId: number;
}

export class AvailableChannelMembersDto {
  @IsUUID()
  conversationId: string;
}

export class ConversationFilterDto {
  @IsOptional()
  @IsEnum(ConversationType)
  type?: ConversationType; // DIRECT | GROUP
}

export class GetEligibleMembersDto {
  @IsOptional()
  @IsString()
  search?: string;
}

export class UpdateChannelInfoDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}

export class AddChannelMemberDto {
  @IsArray()
  @ArrayNotEmpty()
  participantIds: number[];
}
