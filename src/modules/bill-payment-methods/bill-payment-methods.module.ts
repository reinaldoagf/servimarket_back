import { Module } from '@nestjs/common';
import { BillPaymentMethodsService } from './bill-payment-methods.service';
import { BillPaymentMethodsController } from './bill-payment-methods.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [BillPaymentMethodsController],
  providers: [BillPaymentMethodsService, PrismaService],
})
export class BillPaymentMethodsModule {}
