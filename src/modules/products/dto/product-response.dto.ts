// dto/product-response.dto.ts
import { ProductStatus, ProductPacking, UnitMeasurement, PriceCalculation } from '@prisma/client';
import { BrandResponseDto } from '../../brands/dto/brand-response.dto';
import { CategoryResponseDto } from '../../categories/dto/category-response.dto';
import { BusinessResponseDto } from '../../business/dto/business-response.dto';

export class ProductTagDto {
  id: string;
  tag: string;
  createdAt: Date;
}

export class ProductResponseDto {
  id: string;
  name: string;
  status: ProductStatus;
  priceCalculation: PriceCalculation | null;
  unitMeasurement: UnitMeasurement | null;
  brandId?: string | null;
  brand?: BrandResponseDto | null;
  categoryId?: string | null;
  category?: CategoryResponseDto | null;
  businessId?: string | null;
  business?: BusinessResponseDto | null;
  tags?: ProductTagDto[];
  createdAt: Date;
}
