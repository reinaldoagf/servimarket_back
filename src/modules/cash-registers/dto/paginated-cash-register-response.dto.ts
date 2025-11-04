// src/modules/users/dto/paginated-user-response.dto.ts
import { CashRegisterResponseDto } from './cash-register-response.dto';

export class PaginatedCashRegisterResponseDto {
  data: CashRegisterResponseDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
