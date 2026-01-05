import { IsEnum, IsOptional, IsArray, IsString } from 'class-validator';
import { Role } from '@prisma/client';

/**
 * DTO for updating a membership
 */
export class UpdateMembershipDto {
  @IsOptional()
  @IsEnum(Role, { message: 'Role must be OWNER, MANAGER, or WORKER' })
  role?: Role;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[]; // Manager permissions (only used when role is MANAGER)
}

