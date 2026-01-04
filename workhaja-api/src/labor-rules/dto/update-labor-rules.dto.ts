import { IsBoolean, IsInt, Min, Max, IsOptional, IsString, IsIn, IsNumber } from 'class-validator';

/**
 * DTO for updating labor rules
 */
export class UpdateLaborRulesDto {
  @IsOptional()
  @IsBoolean()
  overtimeDailyEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  overtimeDailyMinutes?: number;

  @IsOptional()
  @IsBoolean()
  overtimeWeeklyEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  overtimeWeeklyMinutes?: number;

  @IsOptional()
  @IsBoolean()
  breakPaid?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  weekStartsOn?: number; // 0=Sun, 1=Mon, ..., 6=Sat

  @IsOptional()
  @IsInt()
  @Min(0)
  availabilityDeadlineDays?: number;

  // Check-in Policy
  @IsOptional()
  @IsString()
  @IsIn(['QR', 'GPS'])
  checkinPrimaryMethod?: string;

  @IsOptional()
  @IsBoolean()
  checkinAllowFallback?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  checkinGpsRadius?: number; // in meters

  @IsOptional()
  @IsBoolean()
  checkinRequireBoth?: boolean;

  @IsOptional()
  @IsInt()
  checkinWindowStartMins?: number; // e.g., -30

  @IsOptional()
  @IsInt()
  checkinWindowEndMins?: number; // e.g., 10

  @IsOptional()
  @IsInt()
  checkoutWindowStartMins?: number; // e.g., -10

  @IsOptional()
  @IsInt()
  checkoutWindowEndMins?: number; // e.g., 180

  @IsOptional()
  @IsString()
  @IsIn(['BLOCK', 'ALLOW_FLAG', 'ALLOW'])
  checkinNoShiftBehavior?: string;

  @IsOptional()
  @IsString()
  @IsIn(['BLOCK', 'ALLOW_REQUEST'])
  checkinOfflineBehavior?: string;
}

