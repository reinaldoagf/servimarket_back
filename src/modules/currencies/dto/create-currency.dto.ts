import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateCurrencyDto {
  @IsString()
  coin: string;

  @IsString()
  code: string;

  @IsString()
  symbol: string;

  @IsString()
  name: string;

  @IsString()
  country: string;

  @IsNumber()
  @IsOptional()
  exchange?: number = 1.0;
}
