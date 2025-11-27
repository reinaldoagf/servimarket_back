// src/modules/brands/brands.controller.ts
import { Controller, Get, Post, Put, Body, Query, ParseIntPipe, Delete, Param, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BrandsService } from './brands.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { PaginatedBrandResponseDto } from './dto/paginated-brand-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('brands')
@Controller('brands')
export class BrandsController {
  constructor(private readonly service: BrandsService) {}

  @Get('/')
  @UseGuards(JwtAuthGuard)
  async getByFilters(
    @Query('page', ParseIntPipe) page = '1',
    @Query('pageSize', ParseIntPipe) pageSize = '10',
    @Query('search') search = '',
    @Query('dateKey') dateKey = '',
    @Query('startDate') startDate = '',
    @Query('endDate') endDate = '',
  ): Promise<PaginatedBrandResponseDto> {
    return this.service.getByFilters(
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
  async create(@Body() dto: CreateBrandDto) {
    return this.service.addBrand(dto);
  }
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(@Param('id') id: string, @Body() dto: UpdateBrandDto) {
    return this.service.updateBrand(id, dto);
  }
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id') id: string) {
    return this.service.deleteBrand(id);
  }
}
