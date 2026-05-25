import { PrismaService } from "@/modules/core/prisma/services";
import { AddUserToOfficeDto, CreateOfficeDto, UpdateOfficeDto } from "../dtos";
import { OfficeMemberRole, User } from "@prisma/client";
import { generateId } from "@/utils";
import { buildResponse } from "@/utils/api-response-util";
import { OfficeNotFoundException, UserNotFoundException } from "../errors";
import { BadRequestException, ForbiddenException, HttpStatus, Injectable, NotFoundException } from "@nestjs/common";
import { MailService } from "@/mail/mail.service";


@Injectable()
export class OfficeService {
    constructor(
        private prisma: PrismaService,
        private mailService: MailService,
    ) { }
    async createOffice(user: User, options: CreateOfficeDto) {
        const officeSpace = await this.prisma.office.create({
            data: {
                identifier: generateId({ type: 'identifier' }),
                name: options.name,
                description: options.description,
                ImageUrl: options.ImageUrl,
                userId: user.id,
                members: {
                    create: {
                        userId: user.id,
                        role: OfficeMemberRole.CREATOR
                    }
                }
            }
        })
        return buildResponse({
            message: 'Office created successfully',
            data: officeSpace
        })
    }

    async updateOfficeInfo(user: User, officeId: number, options: UpdateOfficeDto) {
        const officeSpace = await this.prisma.office.findUnique({
            where: {
                id: officeId
            }
        })

        if (!officeSpace) {
            throw new OfficeNotFoundException('Office not found', HttpStatus.NOT_FOUND);
        }

        if (officeSpace.userId !== user.id) {
            throw new OfficeNotFoundException('You are not authorized to update this office', HttpStatus.FORBIDDEN);
        }

        const update = await this.prisma.office.update({
            where: {
                id: officeId
            },
            data: {
                name: options.name,
                description: options.description,
                ImageUrl: options.ImageUrl,
            }
        })

        return buildResponse({
            message: 'Office updated successfully',
            data: update
        })
    }

    async addUserToOffice(user: User, officeId: number, options: AddUserToOfficeDto) {
        if (options.userId === user.id) {
            throw new BadRequestException('You cannot add yourself to the office');
        }

        const result = await this.prisma.$transaction(async (tx) => {
            const [office, requestingMember, existingMember, addedUser] = await Promise.all([
                tx.office.findUnique({ where: { id: officeId }, select: { id: true, name: true } }),
                tx.officeMember.findUnique({
                    where: { officeId_userId: { officeId, userId: user.id } },
                    select: { role: true }
                }),
                tx.officeMember.findUnique({
                    where: { officeId_userId: { officeId, userId: options.userId } },
                    select: { role: true }
                }),
                tx.user.findUnique({
                    where: { id: options.userId },
                    select: { email: true, firstName: true }
                })
            ]);

            if (!office) throw new OfficeNotFoundException('Office not found', HttpStatus.NOT_FOUND);

            const canAdd = requestingMember?.role === OfficeMemberRole.CREATOR
                || requestingMember?.role === OfficeMemberRole.ADMIN;
            if (!requestingMember || !canAdd) {
                throw new ForbiddenException('You are not authorized to add users to this office');
            }

            if (!addedUser) throw new UserNotFoundException('User not found', HttpStatus.NOT_FOUND);
            if (existingMember) throw new BadRequestException('User is already a member of this office');

            if (options.role === OfficeMemberRole.CREATOR) {
                throw new BadRequestException('Cannot assign CREATOR role to a member');
            }
            if (options.role === OfficeMemberRole.ADMIN && requestingMember.role !== OfficeMemberRole.CREATOR) {
                throw new ForbiddenException('Only the office creator can assign admin roles');
            }

            const member = await tx.officeMember.create({
                data: { officeId, userId: options.userId, role: options.role ?? OfficeMemberRole.MEMBER }
            });

            return { officeName: office.name, addedUser, member };
        });

        this.mailService
            .sendAddUserEmail(result.addedUser.firstName, result.addedUser.email, result.officeName)
            .catch((err) => console.error('Failed to send add-user email:', err));

        return buildResponse({
            message: 'User added to office successfully',
            data: result.member
        });
    }

    async removeUserFromOffice(
        user: User,
        officeId: number,
        targetUserId: number
    ) {
        // Prevent self-removal (optional rule)
        if (user.id === targetUserId) {
            throw new ForbiddenException('You cannot remove yourself');
        }

        const result = await this.prisma.$transaction(async (tx) => {
            // Fetch everything needed in parallel
            const [office, requestingMember, targetMember] = await Promise.all([
                tx.office.findUnique({
                    where: { id: officeId },
                    select: { id: true, name: true }
                }),
                tx.officeMember.findUnique({
                    where: {
                        officeId_userId: {
                            officeId,
                            userId: user.id
                        }
                    },
                    select: { role: true }
                }),
                tx.officeMember.findUnique({
                    where: {
                        officeId_userId: {
                            officeId,
                            userId: targetUserId
                        }
                    },
                    select: { role: true }
                })
            ]);

            // Validate office
            if (!office) {
                throw new OfficeNotFoundException(
                    'Office not found',
                    HttpStatus.NOT_FOUND
                );
            }

            // Validate requester
            if (
                !requestingMember ||
                (requestingMember.role !== OfficeMemberRole.CREATOR &&
                    requestingMember.role !== OfficeMemberRole.ADMIN)
            ) {
                throw new ForbiddenException(
                    'You are not authorized to remove users from this office'
                );
            }

            // Validate target member
            if (!targetMember) {
                throw new UserNotFoundException(
                    'User is not a member of this office',
                    HttpStatus.NOT_FOUND
                );
            }

            // Role restrictions
            if (targetMember.role === OfficeMemberRole.CREATOR) {
                throw new ForbiddenException(
                    'The office creator cannot be removed'
                );
            }

            if (
                requestingMember.role === OfficeMemberRole.ADMIN &&
                targetMember.role === OfficeMemberRole.ADMIN
            ) {
                throw new ForbiddenException(
                    'Admins cannot remove other admins'
                );
            }

            // Get user info for email
            const targetUser = await tx.user.findUnique({
                where: { id: targetUserId },
                select: { email: true, firstName: true }
            });

            if (!targetUser) {
                throw new UserNotFoundException(
                    'User not found',
                    HttpStatus.NOT_FOUND
                );
            }

            // Delete membership
            await tx.officeMember.delete({
                where: {
                    officeId_userId: {
                        officeId,
                        userId: targetUserId
                    }
                }
            });

            return { officeName: office.name, targetUser };
        });

        // Send email asynchronously (non-blocking)
        this.mailService
            .sendRemoveUserEmail(
                result.targetUser.firstName,
                result.targetUser.email,
                result.officeName
            )
            .catch((err) => {
                console.error('Failed to send removal email:', err);
            });

        return buildResponse({
            message: 'User removed from office successfully',
        });
    }

}