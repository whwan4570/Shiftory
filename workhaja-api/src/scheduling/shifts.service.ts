import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MonthsService } from './months.service';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { AuditLogService } from '../audit-log/audit-log.service';

/**
 * ShiftsService handles shift CRUD operations
 */
@Injectable()
export class ShiftsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly monthsService: MonthsService,
    private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * Create a new shift
   * @param storeId - Store ID
   * @param userId - User ID (requester, must be OWNER or MANAGER)
   * @param year - Year of the month
   * @param month - Month (1-12)
   * @param createShiftDto - Shift creation data
   * @returns Created shift
   * @throws NotFoundException if month not found
   * @throws ForbiddenException if month is published or user lacks permission
   * @throws BadRequestException if date doesn't belong to month
   */
  async createShift(
    storeId: string,
    userId: string,
    year: number,
    month: number,
    createShiftDto: CreateShiftDto,
  ) {
    // Verify user is OWNER or MANAGER
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
        'You must be a member of this store to create shifts',
      );
    }

    if (
      membership.role !== 'OWNER' &&
      membership.role !== 'MANAGER'
    ) {
      throw new ForbiddenException(
        'Only OWNER and MANAGER can create shifts',
      );
    }

    // Get month and check if it's published
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

    if (scheduleMonth.status === 'PUBLISHED') {
      throw new ForbiddenException(
        'Cannot create shifts in a published schedule month',
      );
    }

    // Validate date belongs to month
    this.monthsService.validateDateInMonth(
      createShiftDto.date,
      year,
      month,
    );

    // Check if shift user is a member of the store
    const shiftUserMembership = await this.prisma.membership.findUnique({
      where: {
        userId_storeId: {
          userId: createShiftDto.userId,
          storeId,
        },
      },
    });

    if (!shiftUserMembership) {
      throw new BadRequestException(
        'User must be a member of this store to be assigned shifts',
      );
    }

    // Parse date string to DateTime
    const dateObj = new Date(createShiftDto.date);
    dateObj.setHours(0, 0, 0, 0);

    // Create shift
    const shift = await this.prisma.shift.create({
      data: {
        storeId,
        monthId: scheduleMonth.id,
        userId: createShiftDto.userId,
        date: dateObj,
        startTime: createShiftDto.startTime,
        endTime: createShiftDto.endTime,
        breakMins: createShiftDto.breakMins || 0,
        status: 'DRAFT',
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    return shift;
  }

  /**
   * Update a shift
   * @param storeId - Store ID
   * @param userId - User ID (requester, must be OWNER or MANAGER)
   * @param shiftId - Shift ID
   * @param updateShiftDto - Shift update data
   * @returns Updated shift
   * @throws NotFoundException if shift not found
   * @throws ForbiddenException if month is published or user lacks permission
   */
  async updateShift(
    storeId: string,
    userId: string,
    shiftId: string,
    updateShiftDto: UpdateShiftDto,
  ) {
    // Verify user is OWNER or MANAGER
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
        'You must be a member of this store to update shifts',
      );
    }

    if (
      membership.role !== 'OWNER' &&
      membership.role !== 'MANAGER'
    ) {
      throw new ForbiddenException(
        'Only OWNER and MANAGER can update shifts',
      );
    }

    // Get shift with month
    const shift = await this.prisma.shift.findUnique({
      where: { id: shiftId },
      include: {
        month: true,
      },
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    if (shift.storeId !== storeId) {
      throw new ForbiddenException('Shift does not belong to this store');
    }

    // Check if month is published
    if (shift.month.status === 'PUBLISHED') {
      throw new ForbiddenException(
        'Cannot update shifts in a published schedule month',
      );
    }

    // If date is being updated, validate it belongs to the month
    if (updateShiftDto.date) {
      this.monthsService.validateDateInMonth(
        updateShiftDto.date,
        shift.month.year,
        shift.month.month,
      );
    }

    // If userId is being updated, verify new user is a member
    if (updateShiftDto.userId) {
      const shiftUserMembership = await this.prisma.membership.findUnique({
        where: {
          userId_storeId: {
            userId: updateShiftDto.userId,
            storeId,
          },
        },
      });

      if (!shiftUserMembership) {
        throw new BadRequestException(
          'User must be a member of this store to be assigned shifts',
        );
      }
    }

    // Prepare update data
    const updateData: any = {};
    if (updateShiftDto.userId) updateData.userId = updateShiftDto.userId;
    if (updateShiftDto.date) {
      const dateObj = new Date(updateShiftDto.date);
      dateObj.setHours(0, 0, 0, 0);
      updateData.date = dateObj;
    }
    if (updateShiftDto.startTime) updateData.startTime = updateShiftDto.startTime;
    if (updateShiftDto.endTime) updateData.endTime = updateShiftDto.endTime;
    if (updateShiftDto.breakMins !== undefined)
      updateData.breakMins = updateShiftDto.breakMins;

    // Get before state for audit log
    const beforeState = {
      userId: shift.userId,
      date: shift.date,
      startTime: shift.startTime,
      endTime: shift.endTime,
      breakMins: shift.breakMins,
    };

    // Update shift
    const updatedShift = await this.prisma.shift.update({
      where: { id: shiftId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    // Log audit
    await this.auditLogService.log({
      storeId,
      actorUserId: userId,
      entityType: 'SHIFT',
      entityId: shiftId,
      action: 'UPDATE',
      before: beforeState,
      after: {
        userId: updatedShift.userId,
        date: updatedShift.date,
        startTime: updatedShift.startTime,
        endTime: updatedShift.endTime,
        breakMins: updatedShift.breakMins,
      },
    });

    return updatedShift;
  }

  /**
   * Delete a shift
   * @param storeId - Store ID
   * @param userId - User ID (requester, must be OWNER or MANAGER)
   * @param shiftId - Shift ID
   * @throws NotFoundException if shift not found
   * @throws ForbiddenException if month is published or user lacks permission
   */
  async deleteShift(storeId: string, userId: string, shiftId: string) {
    // Verify user is OWNER or MANAGER
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
        'You must be a member of this store to delete shifts',
      );
    }

    if (
      membership.role !== 'OWNER' &&
      membership.role !== 'MANAGER'
    ) {
      throw new ForbiddenException(
        'Only OWNER and MANAGER can delete shifts',
      );
    }

    // Get shift with month
    const shift = await this.prisma.shift.findUnique({
      where: { id: shiftId },
      include: {
        month: true,
      },
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    if (shift.storeId !== storeId) {
      throw new ForbiddenException('Shift does not belong to this store');
    }

    // Check if month is published
    if (shift.month.status === 'PUBLISHED') {
      throw new ForbiddenException(
        'Cannot delete shifts in a published schedule month',
      );
    }

    // Get before state for audit log
    const beforeState = {
      id: shift.id,
      userId: shift.userId,
      date: shift.date,
      startTime: shift.startTime,
      endTime: shift.endTime,
      breakMins: shift.breakMins,
      status: shift.status,
    };

    // Delete shift
    await this.prisma.shift.delete({
      where: { id: shiftId },
    });

    // Log audit
    await this.auditLogService.log({
      storeId,
      actorUserId: userId,
      entityType: 'SHIFT',
      entityId: shiftId,
      action: 'DELETE',
      before: beforeState,
    });

    return { ok: true };
  }

  /**
   * List shifts by date range
   * @param storeId - Store ID
   * @param userId - User ID (requester)
   * @param from - Start date (YYYY-MM-DD)
   * @param to - End date (YYYY-MM-DD)
   * @param filterUserId - Optional user ID to filter by
   * @param includeCanceled - Include canceled shifts (default: false)
   * @returns List of shifts
   * @throws ForbiddenException if worker tries to view other users' shifts
   */
  async listShifts(
    storeId: string,
    userId: string,
    from: string,
    to: string,
    filterUserId?: string,
    includeCanceled: boolean = false,
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
        'You must be a member of this store to view shifts',
      );
    }

    // All members (including WORKERs) can view all shifts in the store
    // filterUserId is optional and can be used to filter by specific user

    // Parse dates
    const fromDate = new Date(from);
    fromDate.setHours(0, 0, 0, 0);
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);

    // Build where clause
    const where: any = {
      storeId,
      date: {
        gte: fromDate,
        lte: toDate,
      },
    };

    if (filterUserId) {
      where.userId = filterUserId;
    }

    // Filter canceled shifts by default
    if (!includeCanceled) {
      where.isCanceled = false;
    }

    // Fetch shifts
    const shifts = await this.prisma.shift.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        month: {
          select: {
            id: true,
            year: true,
            month: true,
            status: true,
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    return shifts;
  }
}
