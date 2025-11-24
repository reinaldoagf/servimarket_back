// dto/cash-register-response.dto.ts

export class CashRegisterResponseDto {
  id: string;
  description: string | null;
  collaborator: any;
  businessId: string | null;
  branchId: string | null;
  createdAt: Date;
}
