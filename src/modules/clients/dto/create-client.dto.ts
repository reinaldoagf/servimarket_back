// create-client.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateClientDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Type(() => String)
  userId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Type(() => String)
  clientName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Type(() => String)
  clientDNI?: string;

  @IsString()
  @Type(() => String)
  branchId: string;
}
