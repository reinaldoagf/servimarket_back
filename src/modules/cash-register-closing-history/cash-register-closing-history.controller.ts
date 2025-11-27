import { Controller, Get, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
import { CashRegisterClosingHistoryService } from './cash-register-closing-history.service';
import { PaginatedCashRegisterClosingHistoryResponseDto } from './dto/paginated-cash-register-closing-history-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('cash-register-closing-history')
export class CashRegisterClosingHistoryController {
  constructor(private readonly service: CashRegisterClosingHistoryService) {}
  @Get('/')
  @UseGuards(JwtAuthGuard)
  async getByFilters(
    @Query('branchId') branchId: string = '',
    @Query('page', ParseIntPipe) page = '1',
    @Query('pageSize', ParseIntPipe) pageSize = '10',
    @Query('search') search = '',
    @Query('dateKey') dateKey = '',
    @Query('startDate') startDate = '',
    @Query('endDate') endDate = '',
  ): Promise<PaginatedCashRegisterClosingHistoryResponseDto> {
    return this.service.getByFilters(
      branchId,
      Number(page),
      Number(pageSize),
      search,
      dateKey,
      startDate,
      endDate,
    );
  }
}