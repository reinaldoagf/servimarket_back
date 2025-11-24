// src/business/dto/create-business.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsBoolean, IsOptional, IsEnum } from 'class-validator';
import { BusinessType } from '@prisma/client'; // importamos el enum de Prisma

export class CreateBusinessDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  rif?: string;

  @IsOptional()
  @ApiProperty({ enum: BusinessType })
  @IsEnum(BusinessType)
  type?: BusinessType;

  @IsNotEmpty()
  @IsString()
  ownerId: string; // llega como string, se convierte a number

  @IsBoolean()
  applyVAT: boolean;

  @IsOptional()
  @IsString()
  branches?: string; // llega como JSON string

  @IsOptional()
  @IsString()
  settings?: string; // llega como JSON string
}
