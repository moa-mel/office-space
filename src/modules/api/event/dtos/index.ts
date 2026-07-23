import { Type } from "class-transformer";
import { IsDate, IsDateString, IsNumber, IsOptional, IsString, Matches } from "class-validator";


export class CreateEventDto {
    @Type(() => Number)
    @IsNumber()
    hostId: number;
 
    @IsDateString()
    startDate: string;
 
    @IsString()
    @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
        message: 'startTime must be in HH:mm format',
    })
    startTime: string;
 
    @IsDateString()
    endDate: string;
 
    @IsString()
    @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
        message: 'endTime must be in HH:mm format',
    })
    endTime: string;
 
    @IsString()
    title?: string;

    @IsString()
    notes?: string;

    @IsString()
    timezone?: string;
}

export class UpdateEventDto {
    @IsOptional() 
    @IsDateString()
    startDate?: string;
 
    @IsOptional()
    @IsString()
    @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
        message: 'startTime must be in HH:mm format',
    })
    startTime?: string;
 
    @IsOptional()
    @IsDateString()
    endDate?: string;
 
    @IsOptional()
    @IsString()
    @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
        message: 'endTime must be in HH:mm format',
    })
    endTime?: string;
 
    @IsString()
    @IsOptional() 
    title?: string;

    @IsString()
    @IsOptional() 
    notes?: string;
}

export class GetHostAvailabilityDto {
    @Type(() => Number)
    @IsNumber()
    hostId: number

    @Type(() => Date)
    @IsDate()
    date: Date
}