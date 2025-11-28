// src/auth/dto/update-auth.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { PurchaseStatus } from '@prisma/client';
import {
  IsOptional,
  IsNumber,
  IsEnum,
  IsString,
  ValidateNested,
  ArrayMinSize,
  IsPositive,
} from 'class-validator';
import { Type } from 'class-transformer';

class PurchaseBillPaymentMethodItemDto {
  @IsString()
  billPaymentMethodId: string;

  @IsNumber()
  amountCancelled: number;
}
class PurchaseItemDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  productId: string;

  @IsString()
  productStockId: string;

  @IsOptional()
  @IsNumber()
  @IsPositive() // Optional: further restrict to positive floats
  prevUnitsOrMeasures?: number;

  @IsNumber()
  @IsPositive() // Optional: further restrict to positive floats
  unitsOrMeasures: number;

  @IsNumber()
  price: number;
}

export class UpdateBusinessBranchPurchaseDto {
  
  @IsOptional()
  @IsString()
  clientName?: string;

  @IsOptional()
  @IsString()
  clientDNI?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsString()
  cashRegisterId: string;

  @ApiProperty({ required: false })
  @IsNumber()
  amountCancelled: number;

  @ValidateNested({ each: true })
  @Type(() => PurchaseBillPaymentMethodItemDto)
  purchasesBillPaymentMethod: PurchaseBillPaymentMethodItemDto[];

  @IsEnum(PurchaseStatus)
  status: PurchaseStatus;

  @ValidateNested({ each: true })
  @Type(() => PurchaseItemDto)
  @ArrayMinSize(1)
  purchases: PurchaseItemDto[];
}
