import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateLaborRulesDto } from './dto/update-labor-rules.dto';
import { Role } from '@prisma/client';

/**
 * LaborRulesService handles labor rules operations
 */
@Injectable()
export class LaborRulesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get labor rules for a store
   * @param storeId - Store ID
   * @param userId - User ID (for membership check)
   * @returns Labor rules
   */
  async getLaborRules(storeId: string, userId: string) {
    // Verify user is a member
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_storeId: {
          userId,
          storeId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException(
        'You must be a member of this store to view labor rules',
      );
    }

    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: {
        id: true,
        overtimeDailyEnabled: true,
        overtimeDailyMinutes: true,
        overtimeWeeklyEnabled: true,
        overtimeWeeklyMinutes: true,
        breakPaid: true,
        weekStartsOn: true,
        availabilityDeadlineDays: true,
        // Check-in Policy
        checkinPrimaryMethod: true,
        checkinAllowFallback: true,
        checkinGpsRadius: true,
        checkinRequireBoth: true,
        checkinWindowStartMins: true,
        checkinWindowEndMins: true,
        checkoutWindowStartMins: true,
        checkoutWindowEndMins: true,
        checkinNoShiftBehavior: true,
        checkinOfflineBehavior: true,
      },
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    return store;
  }

  /**
   * Update labor rules for a store
   * @param storeId - Store ID
   * @param userId - User ID (must be OWNER)
   * @param updateDto - Labor rules update data
   * @returns Updated labor rules
   */
  async updateLaborRules(
    storeId: string,
    userId: string,
    updateDto: UpdateLaborRulesDto,
  ) {
    // Verify user is OWNER
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_storeId: {
          userId,
          storeId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException(
        'You must be a member of this store to update labor rules',
      );
    }

    if (membership.role !== Role.OWNER) {
      throw new ForbiddenException(
        'Only OWNER can update labor rules',
      );
    }

    // Verify store exists
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    // Update labor rules and check-in policy
    const updateData: any = {};
    
    if (updateDto.overtimeDailyEnabled !== undefined) updateData.overtimeDailyEnabled = updateDto.overtimeDailyEnabled;
    if (updateDto.overtimeDailyMinutes !== undefined) updateData.overtimeDailyMinutes = updateDto.overtimeDailyMinutes;
    if (updateDto.overtimeWeeklyEnabled !== undefined) updateData.overtimeWeeklyEnabled = updateDto.overtimeWeeklyEnabled;
    if (updateDto.overtimeWeeklyMinutes !== undefined) updateData.overtimeWeeklyMinutes = updateDto.overtimeWeeklyMinutes;
    if (updateDto.breakPaid !== undefined) updateData.breakPaid = updateDto.breakPaid;
    if (updateDto.weekStartsOn !== undefined) updateData.weekStartsOn = updateDto.weekStartsOn;
    if (updateDto.availabilityDeadlineDays !== undefined) updateData.availabilityDeadlineDays = updateDto.availabilityDeadlineDays;
    
    // Check-in Policy
    if (updateDto.checkinPrimaryMethod !== undefined) updateData.checkinPrimaryMethod = updateDto.checkinPrimaryMethod;
    if (updateDto.checkinAllowFallback !== undefined) updateData.checkinAllowFallback = updateDto.checkinAllowFallback;
    if (updateDto.checkinGpsRadius !== undefined) updateData.checkinGpsRadius = updateDto.checkinGpsRadius;
    if (updateDto.checkinRequireBoth !== undefined) updateData.checkinRequireBoth = updateDto.checkinRequireBoth;
    if (updateDto.checkinWindowStartMins !== undefined) updateData.checkinWindowStartMins = updateDto.checkinWindowStartMins;
    if (updateDto.checkinWindowEndMins !== undefined) updateData.checkinWindowEndMins = updateDto.checkinWindowEndMins;
    if (updateDto.checkoutWindowStartMins !== undefined) updateData.checkoutWindowStartMins = updateDto.checkoutWindowStartMins;
    if (updateDto.checkoutWindowEndMins !== undefined) updateData.checkoutWindowEndMins = updateDto.checkoutWindowEndMins;
    if (updateDto.checkinNoShiftBehavior !== undefined) updateData.checkinNoShiftBehavior = updateDto.checkinNoShiftBehavior;
    if (updateDto.checkinOfflineBehavior !== undefined) updateData.checkinOfflineBehavior = updateDto.checkinOfflineBehavior;

    const updated = await this.prisma.store.update({
      where: { id: storeId },
      data: updateData,
      select: {
        id: true,
        overtimeDailyEnabled: true,
        overtimeDailyMinutes: true,
        overtimeWeeklyEnabled: true,
        overtimeWeeklyMinutes: true,
        breakPaid: true,
        weekStartsOn: true,
        availabilityDeadlineDays: true,
        // Check-in Policy
        checkinPrimaryMethod: true,
        checkinAllowFallback: true,
        checkinGpsRadius: true,
        checkinRequireBoth: true,
        checkinWindowStartMins: true,
        checkinWindowEndMins: true,
        checkoutWindowStartMins: true,
        checkoutWindowEndMins: true,
        checkinNoShiftBehavior: true,
        checkinOfflineBehavior: true,
      },
    });

    return updated;
  }
}

