import { Transform } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { OfficeMemberRole } from '@prisma/client';

export class CreateOfficeDto{
    @IsString()
    name: string

    @IsString()
    description: string

    @IsString()
    @IsOptional()
    ImageUrl?: string
}

export class UpdateOfficeDto{
    @IsString()
    @IsOptional()
    name: string

    @IsString()
    @IsOptional()
    description: string

    @IsString()
    @IsOptional()
    ImageUrl?: string
}

export class AddUserToOfficeDto{
    @IsNumber()
    userId: number

    @IsOptional()
    @IsEnum(OfficeMemberRole)
    role?: OfficeMemberRole; 
}