import { Type } from "class-transformer";
import { IsDate, IsNumber, IsString } from "class-validator";


export class CreateBookingDto {
    @Type(() => Number)
    @IsNumber()
    officeId: number;

    @Type(() => Number)
    @IsNumber()
    hostId: number;

    @IsDate()
    startDate: Date;

    @IsDate()
    endDate: Date;

    @IsString()
    title?: string;

    @IsString()
    notes?: string;

    @IsString()
    timezone?: string;

    @IsString()
    meetingUrl?: string;
}

export class UpdateBookingDto {
    @IsDate()
    startDate: Date;

    @IsDate()
    endDate: Date;

    @IsString()
    title?: string;

    @IsString()
    notes?: string;
}

export class GetHostAvailabilityDto {
    @Type(() => Number)
    @IsNumber()
    hostId: number

    @IsDate()
    date: Date
}