// src/clients/clients.controller.ts
import { Controller, Get, Post, Body, Query, ParseIntPipe, Delete, Param, UseGuards } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { PaginatedClientResponseDto } from './dto/paginated-client-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('clients')
export class ClientsController {
  constructor(private readonly service: ClientsService) {}
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
  ): Promise<PaginatedClientResponseDto> {
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
  async create(@Body() dto: CreateClientDto) {
    return this.service.addClient(dto);
  }
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id') id: string) {
    return this.service.deleteClient(id);
  }
}
