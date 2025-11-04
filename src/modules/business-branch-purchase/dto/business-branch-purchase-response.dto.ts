// dto/business-branch-purchase-response.dto.ts
import { PurchaseStatus } from '@prisma/client';

export class BusinessBranchPurchaseResponseDto {
  id: string;
  clientName?: string | null;
  clientDNI?: string | null;
  userId?: string | null;
  cashRegisterId: string;
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
    productId: string;
    productPresentationId?: string | null;
    unitsOrMeasures: number;
    price: number;
    createdAt: Date;
    product?: { id: string; name: string };
    productPresentation?: { id: string; measurementQuantity: number; packing: string | null; flavor?: string | null } | null;
  }[];
}
