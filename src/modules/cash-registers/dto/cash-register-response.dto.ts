// dto/cash-register-response.dto.ts

export class CashRegisterResponseDto {
  id: string;
  description: string | null;
  collaborator: any;
  businessId: string;
  branchId: string | null;
  createdAt: Date;
}
