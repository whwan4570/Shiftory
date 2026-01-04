import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMonthDto } from './dto/create-month.dto';
import { CopyMonthDto } from './dto/copy-month.dto';
import { MonthStatus, ShiftStatus } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditLogService } from '../audit-log/audit-log.service';

/**
 * MonthsService handles schedule month operations
 */
@Injectable()
export class MonthsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
    private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * Create a new schedule month
   * @param storeId - Store ID
   * @param userId - User ID (for membership check)
   * @param createMonthDto - Month creation data
   * @returns Created month
   * @throws ConflictException if month already exists
   * @throws ForbiddenException if user is not OWNER or MANAGER
   */
  async createMonth(
    storeId: string,
    userId: string,
    createMonthDto: CreateMonthDto,
  ) {
    const { year, month, lockAt } = createMonthDto;

    // Verify user is a member and has OWNER or MANAGER role
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
        'You must be a member of this store to create months',
      );
    }

    if (
      membership.role !== 'OWNER' &&
      membership.role !== 'MANAGER'
    ) {
      throw new ForbiddenException(
        'Only OWNER and MANAGER can create schedule months',
      );
    }

    // Check if month already exists
    const existing = await this.prisma.scheduleMonth.findUnique({
      where: {
        storeId_year_month: {
          storeId,
          year,
          month,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Schedule month for ${year}-${month.toString().padStart(2, '0')} already exists`,
      );
    }

    // Create month with OPEN status
    const scheduleMonth = await this.prisma.scheduleMonth.create({
      data: {
        storeId,
        year,
        month,
        status: MonthStatus.OPEN,
        lockAt: lockAt ? new Date(lockAt) : null,
      },
    });

    return scheduleMonth;
  }

  /**
   * Get schedule month by year and month
   * @param storeId - Store ID
   * @param userId - User ID (for membership check)
   * @param year - Year
   * @param month - Month
   * @returns Month with shifts and availabilities
   * @throws NotFoundException if month not found
   * @throws ForbiddenException if user is not a member
   */
  async getMonth(
    storeId: string,
    userId: string,
    year: number,
    month: number,
  ) {
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
        'You must be a member of this store to view months',
      );
    }

    const scheduleMonth = await this.prisma.scheduleMonth.findUnique({
      where: {
        storeId_year_month: {
          storeId,
          year,
          month,
        },
      },
      include: {
        shifts: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
        availabilities: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!scheduleMonth) {
      throw new NotFoundException(
        `Schedule month for ${year}-${month.toString().padStart(2, '0')} not found`,
      );
    }

    return scheduleMonth;
  }

  /**
   * Publish (lock) a schedule month
   * @param storeId - Store ID
   * @param userId - User ID (must be OWNER)
   * @param year - Year
   * @param month - Month
   * @returns Updated month
   * @throws NotFoundException if month not found
   * @throws ForbiddenException if user is not OWNER
   */
  async publishMonth(
    storeId: string,
    userId: string,
    year: number,
    month: number,
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

    if (!membership || membership.role !== 'OWNER') {
      throw new ForbiddenException('Only OWNER can publish schedule months');
    }

    const scheduleMonth = await this.prisma.scheduleMonth.findUnique({
      where: {
        storeId_year_month: {
          storeId,
          year,
          month,
        },
      },
    });

    if (!scheduleMonth) {
      throw new NotFoundException(
        `Schedule month for ${year}-${month.toString().padStart(2, '0')} not found`,
      );
    }

    // Get before state for audit log
    const beforeState = {
      status: scheduleMonth.status,
      lockAt: scheduleMonth.lockAt,
    };

    // Update month status to PUBLISHED and set lockAt if not already set
    const updatedMonth = await this.prisma.$transaction(async (tx) => {
      const month = await tx.scheduleMonth.update({
        where: {
          id: scheduleMonth.id,
        },
        data: {
          status: MonthStatus.PUBLISHED,
          lockAt: scheduleMonth.lockAt || new Date(),
        },
      });

      // Update all shifts in this month to PUBLISHED
      await tx.shift.updateMany({
        where: {
          monthId: scheduleMonth.id,
        },
        data: {
          status: ShiftStatus.PUBLISHED,
        },
      });

      return month;
    });

    // Log audit
    await this.auditLogService.log({
      storeId,
      actorUserId: userId,
      entityType: 'MONTH',
      entityId: scheduleMonth.id,
      action: 'PUBLISH',
      before: beforeState,
      after: {
        status: updatedMonth.status,
        lockAt: updatedMonth.lockAt,
      },
    });

    // Notify all store members of published month
    try {
      const memberships = await this.prisma.membership.findMany({
        where: { storeId },
        select: { userId: true },
      });

      const userIds = memberships.map((m) => m.userId);

      if (userIds.length > 0) {
        await this.notificationsService.enqueueForUsers(
          storeId,
          userIds,
          'MONTH_PUBLISHED',
          'Schedule Published',
          `Schedule for ${year}-${String(month).padStart(2, '0')} has been published`,
          {
            year,
            month,
            monthId: updatedMonth.id,
          },
        );
      }
    } catch (error) {
      console.error('Failed to send notification:', error);
    }

    return updatedMonth;
  }

  /**
   * Check if a month is published and throw if it is
   * @param monthId - Month ID
   * @throws ForbiddenException if month is published
   */
  async ensureMonthNotPublished(monthId: string): Promise<void> {
    const month = await this.prisma.scheduleMonth.findUnique({
      where: { id: monthId },
    });

    if (!month) {
      throw new NotFoundException('Schedule month not found');
    }

    if (month.status === MonthStatus.PUBLISHED) {
      throw new ForbiddenException(
        'Cannot modify shifts in a published schedule month',
      );
    }
  }

  /**
   * Validate that a date belongs to a specific month
   * @param date - Date string (YYYY-MM-DD)
   * @param year - Expected year
   * @param month - Expected month (1-12)
   * @throws BadRequestException if date doesn't belong to the month
   */
  validateDateInMonth(date: string, year: number, month: number): void {
    const dateObj = new Date(date);
    const dateYear = dateObj.getFullYear();
    const dateMonth = dateObj.getMonth() + 1; // getMonth() returns 0-11

    if (dateYear !== year || dateMonth !== month) {
      throw new BadRequestException(
        `Date ${date} does not belong to month ${year}-${month.toString().padStart(2, '0')}`,
      );
    }
  }

  /**
   * Copy shifts from one month to another
   * @param storeId - Store ID
   * @param userId - User ID (must be OWNER or MANAGER)
   * @param copyMonthDto - Copy month data
   * @returns Number of shifts copied
   * @throws NotFoundException if source month not found
   * @throws ForbiddenException if user is not OWNER or MANAGER or target month is published
   */
  async copyMonth(
    storeId: string,
    userId: string,
    copyMonthDto: CopyMonthDto,
  ): Promise<{ copied: number }> {
    const { fromYear, fromMonth, toYear, toMonth } = copyMonthDto;

    // Verify user is a member and has OWNER or MANAGER role
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
        'You must be a member of this store to copy months',
      );
    }

    if (
      membership.role !== 'OWNER' &&
      membership.role !== 'MANAGER'
    ) {
      throw new ForbiddenException(
        'Only OWNER and MANAGER can copy schedule months',
      );
    }

    // Get source month
    const sourceMonth = await this.prisma.scheduleMonth.findUnique({
      where: {
        storeId_year_month: {
          storeId,
          year: fromYear,
          month: fromMonth,
        },
      },
      include: {
        shifts: {
          where: {
            isCanceled: false, // Only copy non-canceled shifts
          },
        },
      },
    });

    if (!sourceMonth) {
      throw new NotFoundException(
        `Source month ${fromYear}-${fromMonth.toString().padStart(2, '0')} not found`,
      );
    }

    // Get or create target month
    let targetMonth = await this.prisma.scheduleMonth.findUnique({
      where: {
        storeId_year_month: {
          storeId,
          year: toYear,
          month: toMonth,
        },
      },
    });

    if (!targetMonth) {
      // Create target month if it doesn't exist
      targetMonth = await this.prisma.scheduleMonth.create({
        data: {
          storeId,
          year: toYear,
          month: toMonth,
          status: MonthStatus.OPEN,
        },
      });
    } else {
      // Check if target month is published
      if (targetMonth.status === MonthStatus.PUBLISHED) {
        throw new ForbiddenException(
          'Cannot copy shifts to a published schedule month',
        );
      }
    }

    // Calculate date offset (difference in days)
    const fromFirstDay = new Date(fromYear, fromMonth - 1, 1);
    const toFirstDay = new Date(toYear, toMonth - 1, 1);
    const daysOffset =
      Math.floor((toFirstDay.getTime() - fromFirstDay.getTime()) / (1000 * 60 * 60 * 24));

    // Get number of days in target month
    const toLastDay = new Date(toYear, toMonth, 0);
    const toMonthDays = toLastDay.getDate();

    // Copy shifts with date adjustment
    let copiedCount = 0;
    for (const sourceShift of sourceMonth.shifts) {
      const sourceDate = new Date(sourceShift.date);
      const sourceDay = sourceDate.getDate();

      // Calculate target date
      const targetDay = sourceDay;
      if (targetDay > toMonthDays) {
        // Skip if day doesn't exist in target month (e.g., Feb 30)
        continue;
      }

      const targetDate = new Date(toYear, toMonth - 1, targetDay);
      targetDate.setHours(0, 0, 0, 0);

      // Check if user is still a member
      const shiftUserMembership = await this.prisma.membership.findUnique({
        where: {
          userId_storeId: {
            userId: sourceShift.userId,
            storeId,
          },
        },
      });

      if (!shiftUserMembership) {
        // Skip if user is no longer a member
        continue;
      }

      // Create shift in target month
      await this.prisma.shift.create({
        data: {
          storeId,
          monthId: targetMonth.id,
          userId: sourceShift.userId,
          date: targetDate,
          startTime: sourceShift.startTime,
          endTime: sourceShift.endTime,
          breakMins: sourceShift.breakMins,
          status: ShiftStatus.DRAFT,
        },
      });

      copiedCount++;
    }

    return { copied: copiedCount };
  }
}
