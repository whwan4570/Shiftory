import { IsEmail, IsEnum, IsOptional, IsArray, IsString } from 'class-validator';
import { Role } from '@prisma/client';

/**
 * DTO for creating a new membership
 */
export class CreateMembershipDto {
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @IsEnum(Role, { message: 'Role must be OWNER, MANAGER, or WORKER' })
  role: Role;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[]; // Manager permissions (only used when role is MANAGER)
}

