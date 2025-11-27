import { Controller, Get, Post, Body, Param, Delete, Query, ParseIntPipe, Put, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { PaginatedRoleResponseDto } from './dto/paginated-role-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('roles')
@Controller('roles')
export class RolesController {
  constructor(private readonly service: RolesService) {}

  @Get('/')
  @UseGuards(JwtAuthGuard)
  async getByFilters(
    @Query('page', ParseIntPipe) page = 1,
    @Query('pageSize', ParseIntPipe) pageSize = 10,
    @Query('search') search = '',
  ): Promise<PaginatedRoleResponseDto> {
    return this.service.getByFilters(page, pageSize, search);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() dto: CreateRoleDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id') id: string) {
    return this.service.delete(id);
  }

  // 🔹 Asignar / actualizar permisos
  @Post(':id/permissions')
  @UseGuards(JwtAuthGuard)
  async updatePermissions(
    @Param('id') id: string,
    @Body('permissionIds') permissionIds: string[],
  ) {
    return this.service.updatePermissions(id, permissionIds);
  }

  // 🔹 Asignar / actualizar páginas
  @Post(':id/pages')
  @UseGuards(JwtAuthGuard)
  async updatePages(
    @Param('id') id: string,
    @Body('pages') pages: string[],
  ) {
    return this.service.updatePages(id, pages);
  }
}
