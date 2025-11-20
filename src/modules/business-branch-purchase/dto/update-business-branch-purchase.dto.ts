// src/auth/dto/update-auth.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

class PurchaseBillPaymentMethodItemDto {
  @IsString()
  billPaymentMethodId: string;

  @IsNumber()
  amountCancelled: number;
}

export class UpdateBusinessBranchPurchaseDto {
  @ApiProperty({ required: false })
  @IsNumber()
  amountCancelled: number;

  @ValidateNested({ each: true })
  @Type(() => PurchaseBillPaymentMethodItemDto)
  @ArrayMinSize(1)
  purchasesBillPaymentMethod: PurchaseBillPaymentMethodItemDto[];
}
