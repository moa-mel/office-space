import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateCallDto {
  @IsOptional()
  @IsString()
  title?: string;
}