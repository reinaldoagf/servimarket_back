// src/modules/categories/dto/paginated-currency-response.dto.ts
import { CurrencyResponseDto } from './currency-response.dto';

export class PaginatedCurrencyResponseDto {
  data: CurrencyResponseDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}