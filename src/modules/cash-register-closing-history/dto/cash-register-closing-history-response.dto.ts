// dto/cash-register-history-response.dto.ts

export class CashRegisterClosingHistoryResponseDto {
  id: string;
  closedCount: number;
  totalClosedAmount: number;
  closingDate: Date;
  branchId: string | null;
  closedById: string | null;
  createdAt: Date;
}
