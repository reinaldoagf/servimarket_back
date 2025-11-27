import { CashRegisterClosingHistoryResponseDto } from './cash-register-closing-history-response.dto';

export class PaginatedCashRegisterClosingHistoryResponseDto {
  data: CashRegisterClosingHistoryResponseDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
