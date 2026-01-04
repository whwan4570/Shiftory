import {
  IsEnum,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsString,
  IsDateString,
  IsIn,
} from 'class-validator';
import { TimeEntryType } from '@prisma/client';

/**
 * DTO for creating a time entry (check-in or check-out)
 */
export class CreateTimeEntryDto {
  @IsEnum(TimeEntryType, { message: 'Type must be CHECK_IN or CHECK_OUT' })
  type: TimeEntryType;

  @IsOptional()
  @IsString()
  @IsIn(['QR', 'GPS'])
  method?: 'QR' | 'GPS'; // Method used for check-in/out (defaults to GPS if not specified)

  @IsOptional()
  @IsString()
  shiftId?: string; // Optional: link to a specific shift

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number; // GPS latitude

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number; // GPS longitude

  @IsOptional()
  @IsDateString()
  clientTimestamp?: string; // Client time (for reference only, server time is used)
}

