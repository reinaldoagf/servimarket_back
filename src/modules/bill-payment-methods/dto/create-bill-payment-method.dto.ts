import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateBillPaymentMethodDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  image?: string | null;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsUUID()
  currencyId?: string;
}
