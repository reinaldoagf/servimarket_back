// create-collaborator.dto.ts
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCollaboratorDto {
  @IsString()
  @Type(() => String) // 🔹 convierte automáticamente a número
  userId: string;

  @IsString()
  @Type(() => String) // 🔹 convierte automáticamente a número
  branchId: string;

  cashRegisterId?: string | null;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean) // 🔹 convierte automáticamente a boolean
  isAdmin?: boolean;
}
