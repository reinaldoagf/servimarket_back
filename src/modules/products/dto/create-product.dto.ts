import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UnitMeasurement, ProductStatus, PriceCalculation } from '@prisma/client';
import { CreateProductTagDto } from './create-product-tag.dto';

export class CreateProductDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Type(() => String)
  flavor: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Type(() => String)
  smell: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  measurement: number;

  @ApiProperty()
  @IsString()
  priceCalculation: PriceCalculation;

  @ApiProperty({ enum: UnitMeasurement })
  @IsEnum(UnitMeasurement)
  unitMeasurement: UnitMeasurement;

  @ApiProperty({ enum: ProductStatus })
  @IsEnum(ProductStatus)
  status: ProductStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Type(() => String)
  brandId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Type(() => String)
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Type(() => String)
  businessId?: string;

  @ApiPropertyOptional({ type: [CreateProductTagDto] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateProductTagDto)
  tags?: CreateProductTagDto[];
}
