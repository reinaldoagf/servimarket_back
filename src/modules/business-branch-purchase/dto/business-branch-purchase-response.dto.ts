// dto/business-branch-purchase-response.dto.ts
import { PurchaseStatus } from '@prisma/client';

export class BusinessBranchPurchaseResponseDto {
  id: string;
  clientName?: string | null;
  clientDNI?: string | null;
  userId?: string | null;
  cashRegisterId: string | null;
  amountCancelled: number;
  totalAmount: number;
  status: PurchaseStatus;
  createdAt: Date;

  // Relaciones
  /* cashRegister: {
    description: string;
    branch?: {
      id: string;
      address: string;
    } | null;
    business?: {
      id: string;
      name: string;
      rif?: string | null;
      logo?: string | null;
    };
    collaborator?: {
      id: string;
      name: string;
      email: string;
      dni: string;
    } | null;
  }; */

  user?: {
    id: string;
    name: string;
    email: string;
  } | null;

  purchases?: {
    id: string;
    unitsOrMeasures: number;
    price: number;
    productId: string | null;
    product: { id: string; name: string } | null;
    createdAt: Date;
  }[];
}
