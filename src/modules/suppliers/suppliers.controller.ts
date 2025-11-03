// src/suppliers/suppliers.controller.ts
import { Controller, Get, Post, Body, Query, ParseIntPipe, Delete, Param, UseGuards } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { PaginatedSupplierResponseDto } from './dto/paginated-supplier-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly service: SuppliersService) {}
  @Get('/')
  @UseGuards(JwtAuthGuard)
  async getByFilters(
    @Query('businessId') businessId: string = '',
    @Query('page', ParseIntPipe) page = '1',
    @Query('size', ParseIntPipe) pageSize = '10',
    @Query('search') search = '',
    @Query('status') status = '',
    @Query('dateKey') dateKey = '',
    @Query('startDate') startDate = '',
    @Query('endDate') endDate = '',
  ): Promise<PaginatedSupplierResponseDto> {
    return this.service.getByFilters(
      businessId,
      Number(page),
      Number(pageSize),
      search,
      status,
      dateKey,
      startDate,
      endDate,
    );
  }
  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() dto: CreateSupplierDto) {
    return this.service.addSupplier(dto);
  }
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id') id: string) {
    return this.service.deleteSupplier(id);
  }
}
