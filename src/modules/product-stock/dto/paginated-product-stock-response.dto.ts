// src/modules/product-stock/dto/paginated-product-stock-response.dto.ts
import { ProductStockResponseDto } from './product-stock-response.dto';

export class PaginatedProductStockResponseDto {
  data: ProductStockResponseDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
