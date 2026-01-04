import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTimeEntryDto } from './dto/create-time-entry.dto';
import { ReviewTimeEntryDto } from './dto/review-time-entry.dto';
import { verifyLocation } from './utils/location.utils';
import { parseDateTime, timeDifferenceMinutes } from './utils/time.utils';
import { TimeEntryType, TimeEntryStatus, Role, NotificationType } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

/**
 * TimeEntriesService handles time entry (check-in/check-out) operations
 */
@Injectable()
export class TimeEntriesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Create a time entry (check-in or check-out)
   * @param storeId - Store ID
   * @param userId - User ID (requester, must be the employee)
   * @param createDto - Time entry data
   * @returns Created time entry
   */
  async createTimeEntry(
    storeId: string,
    userId: string,
    createDto: CreateTimeEntryDto,
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
        'You must be a member of this store to create time entries',
      );
    }

    // Get store with GPS coordinates and check-in policy
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: {
        id: true,
        latitude: true,
        longitude: true,
        checkinGpsRadius: true,
        checkinWindowStartMins: true,
        checkinWindowEndMins: true,
        checkoutWindowStartMins: true,
        checkoutWindowEndMins: true,
        checkinNoShiftBehavior: true,
      },
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    // Get check-in policy settings
    const checkinGpsRadiusMiles = store.checkinGpsRadius ? store.checkinGpsRadius / 1609.34 : 3; // Convert meters to miles

    // Verify location if GPS coordinates are provided
    let locationVerified = false;
    let distanceMiles: number | null = null;

    if (createDto.latitude && createDto.longitude && store.latitude && store.longitude) {
      const locationCheck = verifyLocation(
        store.latitude,
        store.longitude,
        createDto.latitude,
        createDto.longitude,
        checkinGpsRadiusMiles,
      );

      locationVerified = locationCheck.verified;
      distanceMiles = locationCheck.distanceMiles;
    }

    // Get shift if shiftId is provided
    let shift: any = null;
    if (createDto.shiftId) {
      shift = await this.prisma.shift.findUnique({
        where: { id: createDto.shiftId },
      });

      if (!shift) {
        throw new NotFoundException('Shift not found');
      }

      if (shift.userId !== userId || shift.storeId !== storeId) {
        throw new ForbiddenException(
          'Shift does not belong to you or this store',
        );
      }
    }

    // Determine status and flags
    const flags: string[] = [];
    let status: TimeEntryStatus = TimeEntryStatus.PENDING_REVIEW;

    // Check for FLAGGED_OUTSIDE_RADIUS
    if (createDto.type === TimeEntryType.CHECK_IN || createDto.type === TimeEntryType.CHECK_OUT) {
      if (createDto.latitude && createDto.longitude && !locationVerified) {
        flags.push('FLAGGED_OUTSIDE_RADIUS');
      }
    }

    // Check for FLAGGED_NO_SHIFT
    if (!shift) {
      flags.push('FLAGGED_NO_SHIFT');
    }

    // Check for FLAGGED_LATE (for CHECK_IN only)
    if (shift && createDto.type === TimeEntryType.CHECK_IN) {
      const checkinTime = new Date(); // Server time
      const shiftDate = new Date(shift.date);
      const shiftStartTime = parseDateTime(
        shiftDate.toISOString().split('T')[0],
        shift.startTime,
      );

      const diffMinutes = Math.floor((checkinTime.getTime() - shiftStartTime.getTime()) / (1000 * 60));
      const windowStartMins = store.checkinWindowStartMins ?? -30;
      const windowEndMins = store.checkinWindowEndMins ?? 10;

      // If check-in is after the allowed window, flag as late
      if (diffMinutes > windowEndMins) {
        flags.push('FLAGGED_LATE');
      }
    }

    // Auto-approve if QR method and no flags, or if GPS location is verified and no flags
    if (createDto.method === 'QR' && flags.length === 0) {
      status = TimeEntryStatus.APPROVED;
    } else if (locationVerified && flags.length === 0) {
      status = TimeEntryStatus.APPROVED;
    }

    // Parse client timestamp if provided
    const clientTimestamp = createDto.clientTimestamp
      ? new Date(createDto.clientTimestamp)
      : null;

    // Determine method: QR if specified, otherwise GPS (default)
    const method = createDto.method || 'GPS';

    // Create time entry (server timestamp is used by default)
    const timeEntry = await this.prisma.timeEntry.create({
      data: {
        storeId,
        userId,
        shiftId: createDto.shiftId || null,
        type: createDto.type,
        method,
        status,
        clientTimestamp,
        latitude: createDto.latitude || null,
        longitude: createDto.longitude || null,
        distanceMiles,
        locationVerified,
        flags: flags,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        shift: {
          select: {
            id: true,
            date: true,
            startTime: true,
            endTime: true,
          },
        },
      },
    });

    // If auto-approved, no notification needed
    // If pending review, notify managers/owners (optional for MVP)

    return timeEntry;
  }

  /**
   * List time entries for a store
   * @param storeId - Store ID
   * @param userId - User ID (requester)
   * @param filterUserId - Optional user ID to filter by (managers can view all)
   * @param status - Optional status filter
   * @param flaggedOnly - Optional flag to show only entries with flags (exceptions)
   * @returns List of time entries
   */
  async listTimeEntries(
    storeId: string,
    userId: string,
    filterUserId?: string,
    status?: TimeEntryStatus,
    flaggedOnly?: boolean,
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
        'You must be a member of this store to view time entries',
      );
    }

    // Workers can only view their own entries
    // Managers and Owners can view all entries
    let targetUserId: string | undefined;
    if (membership.role === Role.WORKER) {
      targetUserId = userId;
    } else {
      targetUserId = filterUserId;
    }

    const where: any = {
      storeId,
      ...(targetUserId && { userId: targetUserId }),
      ...(status && { status }),
      ...(flaggedOnly && {
        flags: {
          not: null,
        },
      }),
    };

    const timeEntries = await this.prisma.timeEntry.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        shift: {
          select: {
            id: true,
            date: true,
            startTime: true,
            endTime: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
    });

    return timeEntries;
  }

  /**
   * Get pending time entries (for managers/owners to review)
   * @param storeId - Store ID
   * @param userId - User ID (requester, must be MANAGER or OWNER)
   * @param flaggedOnly - Optional flag to show only entries with flags (exceptions)
   * @returns List of pending time entries
   */
  async getPendingTimeEntries(storeId: string, userId: string, flaggedOnly?: boolean) {
    // Verify user is MANAGER or OWNER
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
        'You must be a member of this store to view pending time entries',
      );
    }

    if (membership.role !== Role.OWNER && membership.role !== Role.MANAGER) {
      throw new ForbiddenException(
        'Only MANAGER and OWNER can view pending time entries',
      );
    }

    const where: any = {
      storeId,
      status: TimeEntryStatus.PENDING_REVIEW,
      ...(flaggedOnly && {
        flags: {
          not: null,
        },
      }),
    };

    const timeEntries = await this.prisma.timeEntry.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        shift: {
          select: {
            id: true,
            date: true,
            startTime: true,
            endTime: true,
          },
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
    });

    return timeEntries;
  }

  /**
   * Review (approve/reject) a time entry
   * @param storeId - Store ID
   * @param timeEntryId - Time entry ID
   * @param userId - User ID (requester, must be MANAGER or OWNER)
   * @param reviewDto - Review data
   * @returns Updated time entry
   */
  async reviewTimeEntry(
    storeId: string,
    timeEntryId: string,
    userId: string,
    reviewDto: ReviewTimeEntryDto,
  ) {
    // Verify user is MANAGER or OWNER
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
        'You must be a member of this store to review time entries',
      );
    }

    if (membership.role !== Role.OWNER && membership.role !== Role.MANAGER) {
      throw new ForbiddenException(
        'Only MANAGER and OWNER can review time entries',
      );
    }

    // Find time entry
    const timeEntry = await this.prisma.timeEntry.findUnique({
      where: { id: timeEntryId },
      include: {
        user: true,
      },
    });

    if (!timeEntry) {
      throw new NotFoundException('Time entry not found');
    }

    if (timeEntry.storeId !== storeId) {
      throw new ForbiddenException(
        'Time entry does not belong to this store',
      );
    }

    if (timeEntry.status !== TimeEntryStatus.PENDING_REVIEW) {
      throw new BadRequestException(
        'Time entry is not in PENDING_REVIEW status',
      );
    }

    // Update time entry
    const updated = await this.prisma.timeEntry.update({
      where: { id: timeEntryId },
      data: {
        status: reviewDto.status,
        reviewedById: userId,
        reviewedAt: new Date(),
        reviewNote: reviewDto.reviewNote || null,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        shift: {
          select: {
            id: true,
            date: true,
            startTime: true,
            endTime: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    // Create notification for the employee
    const notificationType =
      reviewDto.status === TimeEntryStatus.APPROVED
        ? NotificationType.TIME_ENTRY_APPROVED
        : NotificationType.TIME_ENTRY_REJECTED;

    try {
      await this.notificationsService.enqueueInAppNotification({
        storeId,
        userId: timeEntry.userId,
        type: notificationType,
        title:
          reviewDto.status === TimeEntryStatus.APPROVED
            ? 'Time Entry Approved'
            : 'Time Entry Rejected',
        message:
          reviewDto.status === TimeEntryStatus.APPROVED
            ? `Your ${timeEntry.type.toLowerCase()} has been approved.`
            : `Your ${timeEntry.type.toLowerCase()} has been rejected.${reviewDto.reviewNote ? ` Note: ${reviewDto.reviewNote}` : ''}`,
        data: {
          timeEntryId: timeEntry.id,
          type: timeEntry.type,
          timestamp: timeEntry.timestamp,
        },
      });
    } catch (err) {
      // Log error but don't fail the request
      console.error('Failed to create notification:', err);
    }

    return updated;
  }
}

