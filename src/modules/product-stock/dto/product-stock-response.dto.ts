// dto/product-stock-response.dto.ts
import { ProductResponseDto } from '../../products/dto/product-response.dto';

export class ProductStockResponseDto {
  id: string;
  availables: number;
  salePrice: number;
  purchasePrice: number;
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
