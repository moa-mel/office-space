import { Body, Controller, Delete, Param, ParseIntPipe, Patch, Post, Put, UseGuards } from "@nestjs/common";
import { OfficeService } from "../services";
import { AuthGuard } from "../../auth/guards";
import { CreateOfficeDto, AddUserToOfficeDto, UpdateOfficeDto } from "../dtos";
import { User } from "@prisma/client";
import { GetUser } from "../../user/decorators";

@UseGuards(AuthGuard)
@Controller({
    path: 'office',
})
export class OfficeController {
    constructor(private readonly officeService: OfficeService) { }

    @Post('create')
    async createOffice(
        @GetUser() user: User,
        @Body() dto: CreateOfficeDto) {
        return this.officeService.createOffice(user, dto);
    }

    @Put('update/:id')
    async updateOfficeInfo(
        @GetUser() user: User,
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateOfficeDto) {
        return this.officeService.updateOfficeInfo(user, id, dto);
    }

    @Patch('member/:id')
    async addUserToOffice(
        @GetUser() user: User,
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: AddUserToOfficeDto) {
        return this.officeService.addUserToOffice(user, id, dto);
    }

    @Delete(':id/member/:userId')
    async removeUserFromOffice(
        @GetUser() user: User,
        @Param('id', ParseIntPipe) id: number,
        @Param('userId', ParseIntPipe) userId: number) {
        return this.officeService.removeUserFromOffice(user, id, userId);
    }
}