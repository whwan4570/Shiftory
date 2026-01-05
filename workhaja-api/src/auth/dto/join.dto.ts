import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

/**
 * DTO for joining a store with invite code
 */
export class JoinDto {
  @IsString()
  @MinLength(1, { message: 'Invite code is required' })
  @MaxLength(50, { message: 'Invite code must not exceed 50 characters' })
  inviteCode: string;

  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(100, { message: 'Password must not exceed 100 characters' })
  password: string;

  @IsString()
  @MinLength(1, { message: 'Name is required' })
  @MaxLength(100, { message: 'Name must not exceed 100 characters' })
  name: string;
}

