import { Controller, Query, Get, Post, Body, Param, Put, Delete, ParseIntPipe, UseGuards } from '@nestjs/common';
import { CurrenciesService } from './currencies.service';
import { CreateCurrencyDto } from './dto/create-currency.dto';
import { UpdateCurrencyDto } from './dto/update-currency.dto';
import { PaginatedCurrencyResponseDto } from './dto/paginated-currency-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('currencies')
export class CurrenciesController {
  constructor(private readonly service: CurrenciesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() data: CreateCurrencyDto) {
    return this.service.create(data);
  }

  @Get('/all')
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.service.findAll();
  }

  @Get('/')
  @UseGuards(JwtAuthGuard)
  async getByFilters(
    @Query('page', ParseIntPipe) page = '1',
    @Query('size', ParseIntPipe) pageSize = '10',
    @Query('search') search = '',
    @Query('dateKey') dateKey = '',
    @Query('startDate') startDate = '',
    @Query('endDate') endDate = '',
  ): Promise<PaginatedCurrencyResponseDto> {
    return this.service.getByFilters(
      Number(page),
      Number(pageSize),
      search,
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

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() data: UpdateCurrencyDto) {
    return this.service.update(id, data);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
