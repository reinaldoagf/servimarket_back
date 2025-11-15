// src/business-branch-purchase/business-branch-purchase.module.ts
import { Module } from '@nestjs/common';
import { BusinessBranchPurchaseController } from './business-branch-purchase.controller';
import { BusinessBranchPurchaseService } from './business-branch-purchase.service';
import { ClientsService } from '../clients/clients.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { MetricsWsModule } from '../metrics-ws/metrics-ws.module'; // 👈 IMPORTAR

@Module({
  imports: [MetricsWsModule],
  controllers: [BusinessBranchPurchaseController],
  providers: [BusinessBranchPurchaseService, ClientsService, PrismaService],
})
export class BusinessBranchPurchaseModule {}
