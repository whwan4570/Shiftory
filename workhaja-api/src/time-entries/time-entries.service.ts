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

    // Get store with GPS coordinates
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    // Verify location if GPS coordinates are provided
    let locationVerified = false;
    let distanceMiles: number | null = null;

    if (createDto.latitude && createDto.longitude) {
      const locationCheck = verifyLocation(
        store.latitude,
        store.longitude,
        createDto.latitude,
        createDto.longitude,
        3, // 3 miles radius
      );

      locationVerified = locationCheck.verified;
      distanceMiles = locationCheck.distanceMiles;
    }

    // Determine status: AUTO_APPROVED if location is verified, otherwise PENDING_REVIEW
    // For MVP: if location is verified and within radius, auto-approve
    // Otherwise, set to PENDING_REVIEW for manual review
    let status: TimeEntryStatus = TimeEntryStatus.PENDING_REVIEW;
    if (locationVerified) {
      status = TimeEntryStatus.APPROVED;
    }

    // If shiftId is provided, verify it exists and belongs to the user
    if (createDto.shiftId) {
      const shift = await this.prisma.shift.findUnique({
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
   * @returns List of time entries
   */
  async listTimeEntries(
    storeId: string,
    userId: string,
    filterUserId?: string,
    status?: TimeEntryStatus,
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
   * @returns List of pending time entries
   */
  async getPendingTimeEntries(storeId: string, userId: string) {
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

    const timeEntries = await this.prisma.timeEntry.findMany({
      where: {
        storeId,
        status: TimeEntryStatus.PENDING_REVIEW,
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

