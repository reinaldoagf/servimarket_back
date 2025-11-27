import { Module } from '@nestjs/common';
import { CashRegisterClosingHistoryController } from './cash-register-closing-history.controller';
import { CashRegisterClosingHistoryService } from './cash-register-closing-history.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [CashRegisterClosingHistoryController],
  providers: [CashRegisterClosingHistoryService, PrismaService],
})
export class CashRegisterClosingHistoryModule {}