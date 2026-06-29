import { IsInt, IsString } from "class-validator";

export class ParseSchedulingRequestDto{
    @IsInt()
    userId: number;

    @IsString()
    message: string

}