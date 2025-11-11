import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateProductStockDto {
  @IsInt()
  @Min(0)
  availables: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  salePrice: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  purchasePrice: number;

  @IsNumber()
  @Min(0)
  profitPercentage: number;

  @IsNumber()
  @Min(0)
  returnOnInvestment: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  productId: string;

  @IsString()
  branchId: string;
}
