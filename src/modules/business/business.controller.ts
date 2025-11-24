// src/business/business.controller.ts
import {
  Controller,
  Req,
  Get,
  Query,
  Post,
  Put,
  Patch,
  Body,
  UseInterceptors,
  UploadedFile,
  Delete,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { PaginatedBusinessResponseDto } from './dto/paginated-business-response.dto';
import { UpdateBranchAvailabilityDto } from './dto/update-branch-availability.dto';
import { BusinessService } from './business.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('business')
export class BusinessController {
  constructor(private readonly service: BusinessService) {}

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getById(@Req() req: any, @Param('id') id: string) {
    const requestingUserID = req.user.sub; // viene del payload del JWT
    return this.service.getById(requestingUserID, id);
  }

  @Get('/')
  @UseGuards(JwtAuthGuard)
  async getByFilters(
    @Query('country') country = '',
    @Query('state') state = '',
    @Query('city') city = '',
    @Query('page', ParseIntPipe) page = '1',
    @Query('size', ParseIntPipe) pageSize = '10',
    @Query('search') search = '',
    @Query('dateKey') dateKey = '',
    @Query('startDate') startDate = '',
    @Query('endDate') endDate = '',
  ): Promise<PaginatedBusinessResponseDto> {
    return this.service.getByFilters(
      country,
      state,
      city,
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
  @UseInterceptors(
    FileInterceptor('logo', {
      storage: diskStorage({
        destination: './uploads/logos', // 📂 carpeta donde se guardan
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
    }),
  ) // opcional, si envías archivo "logo"
  async create(@Body() body: CreateBusinessDto, @UploadedFile() file?: Express.Multer.File) {
    let branches: {
      country: string;
      state: string;
      city: string;
      address: string;
      phone: string;
      currencyId: string;
      schedule247: boolean;
      itsOpen: boolean;
      businessHours: string;
    }[] = [];
    if (body.branches) {
      try {
        branches = JSON.parse(body.branches) || [];
      } catch {
        throw new Error('Invalid branches JSON format');
      }
    }

    return this.service.create({
      name: body.name,
      rif: body.rif,
      type: body.type,
      ownerId: body.ownerId,
      applyVAT: body.applyVAT,
      branches,
      logo: file ? file.filename : null,
    });
  }
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('logo', {
      storage: diskStorage({
        destination: './uploads/logos', // 📂 carpeta donde se guardan
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
    }),
  ) // opcional, si envías archivo "logo"
  async update(@Param('id') id: string, @Body() body: UpdateBusinessDto, @UploadedFile() file?: Express.Multer.File) {
    let branches: {
      country: string;
      state: string;
      city: string;
      address: string;
      phone: string;
      currencyId: string;
      schedule247: boolean;
      itsOpen: boolean;
      businessHours: string;
    }[] = [];
    if (body.branches) {
      try {
        branches = JSON.parse(body.branches) || [];
      } catch {
        throw new Error('Invalid branches JSON format');
      }
    }

    let settings: {
      id: string;
      key: string;
      country: string;
      floatValue: number;
      stringValue: string;
      userId: string;
      businessId: string;
      branchId: string;
      createdAt: Date;
    }[] = [];
    if (body.settings) {
      try {
        settings = JSON.parse(body.settings) || [];
      } catch {
        throw new Error('Invalid settings JSON format');
      }
    }
    // Construimos el objeto data dinámicamente
    const updateData: any = {
      name: body.name,
      rif: body.rif,
      type: body.type ?? '',
      branches,
      settings,
    };

    // Solo actualizar 'logo' si viene file
    if (file?.filename) {
      updateData.logo = file.filename;
    }

    return this.service.update(id, updateData);
  }
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
  @Patch('branch/:id/availability')
  @UseGuards(JwtAuthGuard)
  async updateBranchStatus(
    @Param('id') id: string,
    @Body() body: UpdateBranchAvailabilityDto
  ) {
    return this.service.updateBranchAvailability(id, body.itsOpen);
  }
}
