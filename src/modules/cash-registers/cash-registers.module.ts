import { Module } from '@nestjs/common';
import { CashRegistersController } from './cash-registers.controller';
import { CashRegistersService } from './cash-registers.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [CashRegistersController],
  providers: [CashRegistersService, PrismaService],
})
export class CashRegistersModule {}