// dto/product-stock-response.dto.ts
import { ProductResponseDto } from '../../products/dto/product-response.dto';

export class ProductStockResponseDto {
  id: string;
  units: number;
  priceByUnit: number | null;
  availableQuantity: number | null;
  priceByMeasurement: number | null;
  quantityPerMeasure: number | null;
  totalSellingPrice: number;
  purchasePricePerUnit: number;
  profitPercentage: number;
  returnOnInvestment: number;
  productId: string | null;
  product: ProductResponseDto | null;
  branchId: string;
  branch: {
    id: string;
    country: string;
    state: string;
    city: string;
    address: string;
  };
  createdAt: Date;
}
