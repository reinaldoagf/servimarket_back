import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { PaginatedRoleResponseDto } from './dto/paginated-role-response.dto';
import { Prisma, PermissionType } from '@prisma/client';

const SELECT_FIELDS = {
  id: true,
  key: true,
  name: true,
  createdAt: true,
  permissions: {
    include: {
      permission: true,
    },
  },
  pages: true,
};

@Injectable()
export class RolesService {
  constructor(private service: PrismaService) {}

  async getByFilters(page = 1, size = 10, search = ''): Promise<PaginatedRoleResponseDto> {
    const skip = (page - 1) * size;

    const where: Prisma.RoleWhereInput = search
      ? { OR: [{ name: { contains: search } }, { key: { contains: search } }] }
      : {};

    const [total, data] = await Promise.all([
      this.service.role.count({ where }),
      this.service.role.findMany({
        where,
        select: SELECT_FIELDS,
        orderBy: { createdAt: 'desc' },
        skip,
        take: size,
      }),
    ]);

    return {
      data,
      total,
      page,
      pageSize: size,
      totalPages: Math.ceil(total / size),
    };
  }

  async getById(id: string) {
    const role = await this.service.role.findUnique({
      where: { id },
      select: SELECT_FIELDS,
    });
    if (!role) throw new NotFoundException(`Role with id ${id} not found`);
    return role;
  }

  // ✅ Crear nuevo rol
  async create(dto: CreateRoleDto) {
    const { name, key, pages = [], permissions = [] } = dto;

    // Validar permisos con el enum
    const validPerms = Object.values(PermissionType) as string[];
    const invalid = permissions.filter((p) => !validPerms.includes(p));
    if (invalid.length > 0) {
      throw new BadRequestException(`Invalid permissions: ${invalid.join(', ')}`);
    }

    return await this.service.$transaction(async (tx) => {
      // Verificar key único
      const existing = await tx.role.findUnique({ where: { key } });
      if (existing) {
        throw new BadRequestException(`Role with key "${key}" already exists`);
      }

      // Crear rol
      const role = await tx.role.create({ data: { name, key } });

      // Crear páginas
      if (pages.length > 0) {
        await tx.rolePage.createMany({
          data: pages.map((page) => ({ page, roleId: role.id })),
          skipDuplicates: true,
        });
      }

      // Crear permisos si no existen
      if (permissions.length > 0) {
        const foundPerms = await tx.permission.findMany({
          where: { type: { in: permissions as PermissionType[] } },
        });

        await tx.rolePermission.createMany({
          data: foundPerms.map((p) => ({
            roleId: role.id,
            permissionId: p.id,
          })),
          skipDuplicates: true,
        });
      }

      // Retornar con relaciones
      return await tx.role.findUnique({
        where: { id: role.id },
        include: {
          pages: true,
          permissions: { include: { permission: true } },
        },
      });
    });
  }
  // ✅ Actualizar rol
  async update(id: string, dto: UpdateRoleDto) {
    const { name, key, pages = [], permissions = [] } = dto;

    const existing = await this.service.role.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Role with ID ${id} not found`);

    const validPerms = Object.values(PermissionType) as string[];
    const invalid = permissions.filter((p) => !validPerms.includes(p));
    if (invalid.length > 0) {
      throw new BadRequestException(`Invalid permissions: ${invalid.join(', ')}`);
    }

    try {
      return await this.service.$transaction(async (tx) => {
        // Actualizar datos básicos
        await tx.role.update({
          where: { id },
          data: { name, key },
        });

        // Actualizar páginas
        await tx.rolePage.deleteMany({ where: { roleId: id } });
        if (pages.length > 0) {
          await tx.rolePage.createMany({
            data: pages.map((page) => ({ page, roleId: id })),
          });
        }

        // Eliminar relaciones previas y recrearlas
        await tx.rolePermission.deleteMany({ where: { roleId: id } });

        if (permissions.length > 0) {
          const foundPerms = await tx.permission.findMany({
            where: { type: { in: permissions as PermissionType[] } },
            select: { id: true },
          });

          await tx.rolePermission.createMany({
            data: foundPerms.map((p) => ({
              roleId: id,
              permissionId: p.id,
            })),
          });
        }

        // Retornar el rol actualizado
        return await tx.role.findUnique({
          where: { id },
          include: {
            pages: true,
            permissions: { include: { permission: true } },
          },
        });
      });
    } catch (err) {
      throw new BadRequestException(`Error updating role: ${err.message}`);
    }
  }
  // ✅ Eliminar un rol con dependencias
  async delete(id: string) {
    try {
      // 🔹 Verificar si el rol existe
      const role = await this.service.role.findUnique({ where: { id } });
      if (!role) {
        throw new NotFoundException(`Role with ID ${id} not found`);
      }

      // 🔹 Eliminar las páginas asociadas
      await this.service.rolePage.deleteMany({
        where: { roleId: id },
      });

      // 🔹 Eliminar los permisos asociados
      await this.service.rolePermission.deleteMany({
        where: { roleId: id },
      });

      // 🔹 Finalmente eliminar el rol
      await this.service.role.delete({ where: { id } });

      return { message: 'Role deleted successfully' };
    } catch (err) {
      throw new BadRequestException(`Error deleting role: ${err.message}`);
    }
  }

  async updatePermissions(id: string, permissionIds: string[]) {
    try {
      const role = await this.service.role.update({
        where: { id },
        data: {
          permissions: {
            deleteMany: {}, // Elimina todas las relaciones previas
            create: permissionIds.map((pid) => ({
              permission: { connect: { id: pid } },
            })),
          },
        },
        include: { permissions: { include: { permission: true } } },
      });

      return {
        message: 'Permisos actualizados correctamente',
        role,
      };
    } catch (err) {
      throw new BadRequestException(`Error actualizando permisos: ${err.message}`);
    }
  }

  async updatePages(id: string, pages: string[]) {
    try {
      const role = await this.service.role.update({
        where: { id },
        data: {
          pages: {
            deleteMany: {}, // Limpia las páginas actuales
            create: pages.map((page) => ({ page })),
          },
        },
        include: { pages: true },
      });

      return {
        message: 'Páginas actualizadas correctamente',
        role,
      };
    } catch (err) {
      throw new BadRequestException(`Error actualizando páginas: ${err.message}`);
    }
  }
}
