// src/modules/products/products.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Query,
  ParseIntPipe,
  Delete,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PaginatedProductResponseDto } from './dto/paginated-product-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

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
  ): Promise<PaginatedProductResponseDto> {
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
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() dto: CreateProductDto) {
    return this.service.addProduct(dto);
  }
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.service.updateProduct(id, dto);
  }
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id') id: string) {
    return this.service.deleteProduct(id);
  }
}
