// create-cash-register.dto.ts
import { IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCashRegisterDto {
  @IsString()
  @Type(() => String) // 🔹 convierte automáticamente a número
  businessId: string;

  @IsString()
  @Type(() => String) // 🔹 convierte automáticamente a número
  branchId: string;

  @IsString()
  @Type(() => String) // 🔹 convierte automáticamente a boolean
  description: string;
}
