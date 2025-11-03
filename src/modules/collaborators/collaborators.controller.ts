// src/collaborators/collaborators.controller.ts
import { Controller, Get, Post, Body, Query, ParseIntPipe, Delete, Param, UseGuards } from '@nestjs/common';
import { CollaboratorsService } from './collaborators.service';
import { CreateCollaboratorDto } from './dto/create-collaborator.dto';
import { PaginatedCollaboratorResponseDto } from './dto/paginated-collaborator-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('collaborators')
export class CollaboratorsController {
  constructor(private readonly service: CollaboratorsService) {}
  @Get('/')
  @UseGuards(JwtAuthGuard)
  async getByFilters(
    @Query('businessId') businessId: string = '',
    @Query('branchId') branchId: string = '',
    @Query('page', ParseIntPipe) page = '1',
    @Query('size', ParseIntPipe) pageSize = '10',
    @Query('search') search = '',
    @Query('status') status = '',
    @Query('dateKey') dateKey = '',
    @Query('startDate') startDate = '',
    @Query('endDate') endDate = '',
  ): Promise<PaginatedCollaboratorResponseDto> {
    return this.service.getByFilters(
      businessId,
      branchId,
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
  async create(@Body() dto: CreateCollaboratorDto) {
    return this.service.addCollaborator(dto);
  }
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id') id: string) {
    return this.service.deleteCollaborator(id);
  }
}
