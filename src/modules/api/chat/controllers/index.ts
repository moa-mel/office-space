import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ChatService } from "../services";
import { AddChannelMemberDto, ConversationFilterDto, CreateChannelDto, FetchMessagesDto, GetEligibleMembersDto, JoinChatDto, UpdateChannelInfoDto } from "../dtos";
import { User } from "@prisma/client";
import { GetUser } from "@/modules/api/user/decorators";
import { AuthGuard } from "@/modules/api/auth/guards";

@UseGuards(AuthGuard)
@Controller({
  path: 'chats',
})

export class ChatController {
  constructor(private readonly chatService: ChatService) { }

  @Post('start')
  async joinChat(@Body() dto: JoinChatDto, @GetUser() user: User) {
    return await this.chatService.startChat(user, dto);
  }

  @HttpCode(HttpStatus.OK)
  @Get('messages')
  async fetchMessages(@Query() dto: FetchMessagesDto, @GetUser() user: User) {
    return await this.chatService.fetchMessage(user, dto);
  }

  @Post('channels')
  async createChannel(@GetUser() user: User, @Body() dto: CreateChannelDto) {
    return this.chatService.createChannel(user, dto);
  }

  @HttpCode(HttpStatus.OK)
  @Get('channels/eligible-members')
  async getEligibleMembers(
    @GetUser() user: User,
    @Query() dto: GetEligibleMembersDto,
  ) {
    return this.chatService.getEligibleMembersForNewChannel(user, dto);
  }

  @HttpCode(HttpStatus.OK)
  @Get('conversations')
  async getConversations(
    @GetUser() user: User,
    @Query() filter: ConversationFilterDto,
  ) {
    return this.chatService.getConversationList(user, filter);
  }

  @Patch('channels/:conversationId/info')
  async updateChannelInfo(
    @Param('conversationId') conversationId: string,
    @GetUser() user: User,
    @Body() dto: UpdateChannelInfoDto,
  ) {
    return this.chatService.updateChannelInfo(conversationId, user, dto);
  }

  @Post('channels/:conversationId/add-members')
  async addChannelMember(
    @Param('conversationId') conversationId: string,
    @GetUser() user: User,
    @Body() dto: AddChannelMemberDto,
  ) {
    return this.chatService.addChannelMember(conversationId, user, dto);
  }

  @Get('media-preview')
  async getMediaPreview(@Query() dto: FetchMessagesDto, @GetUser() user: User) {
    return this.chatService.getMediaPreview(user, dto);
  }

  @Get('download-media/:messageId')
  async downloadMessageMedia(@Param('messageId') messageId: number, @GetUser() user: User) {
    return this.chatService.downloadMessageMedia(user, messageId);
  }

}