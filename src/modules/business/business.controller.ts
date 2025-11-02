// src/business/business.controller.ts
import {
  Controller,
  Get,
  Query,
  Post,
  Body,
  UseInterceptors,
  UploadedFile,
  Delete,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { CreateBusinessDto } from './dto/create-business.dto';
import { PaginatedBusinessResponseDto } from './dto/paginated-business-response.dto';
import { BusinessService } from './business.service';

@Controller('business')
export class BusinessController {
  constructor(private readonly service: BusinessService) {}

  @Get('/')
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
      description: body.description ?? '',
      ownerId: body.ownerId,
      branches,
      logo: file ? file.filename : null,
    });
  }
  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
