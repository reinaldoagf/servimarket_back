// src/business-branch-purchase/dto/create-business-branch-purchase.dto.ts

import {
  IsOptional,
  IsString,
  IsNumber,
  IsPositive,
  IsEnum,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PurchaseStatus } from '@prisma/client';

class PurchaseItemDto {
  @IsString()
  productId: string;

  @IsString()
  productStockId: string;

  @IsNumber()
  @IsPositive() // Optional: further restrict to positive floats
  unitsOrMeasures: number;

  @IsNumber()
  price: number;
}

class PurchaseBillPaymentMethodItemDto {
  @IsString()
  billPaymentMethodId: string;

  @IsNumber()
  amountCancelled: number;
}

export class CreateBusinessBranchPurchaseDto {
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

  @IsNumber()
  amountCancelled: number;

  @IsNumber()
  totalAmount: number;

  @IsEnum(PurchaseStatus)
  status: PurchaseStatus;

  @ValidateNested({ each: true })
  @Type(() => PurchaseItemDto)
  @ArrayMinSize(1)
  purchases: PurchaseItemDto[];

  @ValidateNested({ each: true })
  @Type(() => PurchaseBillPaymentMethodItemDto)
  purchasesBillPaymentMethod: PurchaseBillPaymentMethodItemDto[];

  @IsString()
  currency: string;
}
