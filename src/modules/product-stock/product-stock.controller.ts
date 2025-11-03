import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Delete,
  ParseIntPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ProductStockService } from './product-stock.service';
import { CreateProductStockDto } from './dto/create-product-stock.dto';
import { UpdateProductStockDto } from './dto/update-product-stock.dto';
import { PaginatedProductStockResponseDto } from './dto/paginated-product-stock-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('product-stock')
export class ProductStockController {
  constructor(private readonly service: ProductStockService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateProductStockDto) {
    return this.service.create(dto);
  }

  @Get('/')
  @UseGuards(JwtAuthGuard)
  async getByFilters(
    @Query('branchId') branchId = '',
    @Query('page', ParseIntPipe) page = '1',
    @Query('size', ParseIntPipe) pageSize = '10',
    @Query('search') search = '',
    @Query('dateKey') dateKey = '',
    @Query('startDate') startDate = '',
    @Query('endDate') endDate = '',
  ): Promise<PaginatedProductStockResponseDto> {
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

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() dto: UpdateProductStockDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Delete(':branchId/:productId')
  @UseGuards(JwtAuthGuard)
  deleteProductStockByBranch(
    @Param('branchId') branchId: string,
    @Param('productId') productId: string,
  ) {
    return this.service.deleteProductStockByBranch(branchId, productId);
  }
}
