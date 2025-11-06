// src/cash-registers/cash-registers.controller.ts
import { Controller, Get, Post, Body, Query, ParseIntPipe, Delete, Param, UseGuards } from '@nestjs/common';
import { CashRegistersService } from './cash-registers.service';
import { CreateCashRegisterDto } from './dto/create-cash-register.dto';
import { PaginatedCashRegisterResponseDto } from './dto/paginated-cash-register-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('cash-registers')
export class CashRegistersController {
  constructor(private readonly service: CashRegistersService) {}
  @Get('/')
  @UseGuards(JwtAuthGuard)
  async getByFilters(
    @Query('businessId') businessId: string = '',
    @Query('branchId') branchId: string = '',
    @Query('page', ParseIntPipe) page = '1',
    @Query('size', ParseIntPipe) pageSize = '10',
    @Query('search') search = '',
    @Query('dateKey') dateKey = '',
    @Query('startDate') startDate = '',
    @Query('endDate') endDate = '',
  ): Promise<PaginatedCashRegisterResponseDto> {
    return this.service.getByFilters(
      businessId,
      branchId,
      Number(page),
      Number(pageSize),
      search,
      dateKey,
      startDate,
      endDate,
    );
  }
  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() dto: CreateCashRegisterDto) {
    return this.service.addCashRegister(dto);
  }
  @Get(':id/sales-to-close')
  @UseGuards(JwtAuthGuard)
  async salesToClose(@Param('id') id: string) {
    return this.service.salesToClose(id);
  }
  @Get(':id/close-sales')
  @UseGuards(JwtAuthGuard)
  async closeSales(@Param('id') id: string) {
    return this.service.closeSales(id);
  }
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id') id: string) {
    return this.service.deleteCashRegister(id);
  }
}
