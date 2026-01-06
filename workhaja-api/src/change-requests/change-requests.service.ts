import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from './audit.service';
import { CreateChangeRequestDto } from './dto/create-change-request.dto';
import { ApproveChangeRequestDto } from './dto/approve-change-request.dto';
import { RejectChangeRequestDto } from './dto/reject-change-request.dto';
import {
  ChangeRequestType,
  ChangeRequestStatus,
  ShiftStatus,
} from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

/**
 * ChangeRequestsService handles change request operations
 */
@Injectable()
export class ChangeRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Create a change request
   * @param storeId - Store ID
   * @param userId - User ID (requester)
   * @param createDto - Change request data
   * @returns Created change request
   */
  async createRequest(
    storeId: string,
    userId: string,
    createDto: CreateChangeRequestDto,
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
        'You must be a member of this store to create change requests',
      );
    }

    // Get shift and verify it belongs to store
    const shift = await this.prisma.shift.findUnique({
      where: { id: createDto.shiftId },
      include: {
        user: true,
      },
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    if (shift.storeId !== storeId) {
      throw new ForbiddenException('Shift does not belong to this store');
    }

    // Verify shift is PUBLISHED
    if (shift.status !== ShiftStatus.PUBLISHED) {
      throw new BadRequestException(
        'Change requests can only be created for published shifts',
      );
    }

    // Workers can only create requests for their own shifts
    if (membership.role === 'WORKER' && shift.userId !== userId) {
      throw new ForbiddenException(
        'Workers can only create change requests for their own shifts',
      );
    }

    // Type-specific validations
    if (createDto.type === ChangeRequestType.SHIFT_TIME_CHANGE) {
      if (!createDto.proposedStartTime || !createDto.proposedEndTime) {
        throw new BadRequestException(
          'proposedStartTime and proposedEndTime are required for TIME_CHANGE',
        );
      }
      // Validate time order
      if (createDto.proposedEndTime <= createDto.proposedStartTime) {
        throw new BadRequestException(
          'proposedEndTime must be after proposedStartTime',
        );
      }
    }

    if (createDto.type === ChangeRequestType.SHIFT_SWAP_REQUEST) {
      if (!createDto.swapShiftId) {
        throw new BadRequestException(
          'swapShiftId is required for SWAP_REQUEST',
        );
      }

      // Verify swap shift exists and is PUBLISHED
      const swapShift = await this.prisma.shift.findUnique({
        where: { id: createDto.swapShiftId },
        include: {
          user: true,
        },
      });

      if (!swapShift) {
        throw new NotFoundException('Swap shift not found');
      }

      if (swapShift.storeId !== storeId) {
        throw new BadRequestException(
          'Swap shift must belong to the same store',
        );
      }

      if (swapShift.status !== ShiftStatus.PUBLISHED) {
        throw new BadRequestException(
          'Swap shift must be published',
        );
      }

      if (swapShift.userId === shift.userId) {
        throw new BadRequestException(
          'Cannot swap shift with the same user',
        );
      }
    }

    // Check for existing PENDING request for this shift
    const existingPending = await this.prisma.changeRequest.findFirst({
      where: {
        shiftId: createDto.shiftId,
        status: ChangeRequestStatus.PENDING,
      },
    });

    if (existingPending) {
      throw new ConflictException(
        'A pending change request already exists for this shift',
      );
    }

    // Create change request
    const changeRequest = await this.prisma.changeRequest.create({
      data: {
        storeId,
        type: createDto.type,
        shiftId: createDto.shiftId,
        createdById: userId,
        reason: createDto.reason,
        proposedStartTime: createDto.proposedStartTime,
        proposedEndTime: createDto.proposedEndTime,
        proposedBreakMins: createDto.proposedBreakMins,
        swapShiftId: createDto.swapShiftId,
        status: ChangeRequestStatus.PENDING,
      },
      include: {
        shift: {
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
        createdBy: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    // Log audit
    await this.auditService.log(
      storeId,
      userId,
      'CHANGE_REQUEST_CREATED',
      'ChangeRequest',
      changeRequest.id,
      undefined,
      {
        type: changeRequest.type,
        shiftId: changeRequest.shiftId,
      },
    );

    // Notify OWNER/MANAGER of new request
    try {
      const managers = await this.prisma.membership.findMany({
        where: {
          storeId,
          role: { in: ['OWNER', 'MANAGER'] },
        },
        select: { userId: true },
      });

      const managerUserIds = managers.map((m) => m.userId);

      if (managerUserIds.length > 0) {
        await this.notificationsService.enqueueForUsers(
          storeId,
          managerUserIds,
          'CHANGE_REQUEST_CREATED',
          'New Change Request',
          `${changeRequest.createdBy.name} created a ${changeRequest.type} request`,
          {
            requestId: changeRequest.id,
            shiftId: changeRequest.shiftId,
            type: changeRequest.type,
            createdById: userId,
          },
        );
      }

      // For SWAP requests, also notify the swap shift owner
      if (createDto.type === ChangeRequestType.SHIFT_SWAP_REQUEST && createDto.swapShiftId) {
        const swapShift = await this.prisma.shift.findUnique({
          where: { id: createDto.swapShiftId },
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

        if (swapShift && swapShift.userId !== userId) {
          await this.notificationsService.enqueueInAppNotification({
            storeId,
            userId: swapShift.userId,
            type: 'CHANGE_REQUEST_CREATED',
            title: 'Swap Request',
            message: `${changeRequest.createdBy.name} wants to swap shifts with you. Please review and approve if you agree.`,
            data: {
              requestId: changeRequest.id,
              shiftId: changeRequest.shiftId,
              swapShiftId: createDto.swapShiftId,
              type: changeRequest.type,
              createdById: userId,
            },
          });
        }
      }
    } catch (error) {
      // Don't fail request creation if notification fails
      console.error('Failed to send notification:', error);
    }

    return changeRequest;
  }

  /**
   * List change requests
   * @param storeId - Store ID
   * @param userId - User ID (requester)
   * @param status - Filter by status (optional)
   * @param type - Filter by type (optional)
   * @param mine - Only show user's requests (optional)
   * @returns List of change requests
   */
  async listRequests(
    storeId: string,
    userId: string,
    status?: ChangeRequestStatus,
    type?: ChangeRequestType,
    mine?: boolean,
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
        'You must be a member of this store to view change requests',
      );
    }

    // Build where clause
    const where: any = {
      storeId,
    };

    if (status) {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    // Workers can only see their own requests
    if (membership.role === 'WORKER') {
      if (mine === false) {
        throw new ForbiddenException(
          'Workers can only view their own change requests',
        );
      }
      where.createdById = userId;
    } else if (mine === true) {
      // Manager/Owner can filter by mine
      where.createdById = userId;
    }

    const requests = await this.prisma.changeRequest.findMany({
      where,
      include: {
        shift: {
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
        createdBy: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        candidates: {
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    return requests;
  }

  /**
   * Get change request detail
   * @param storeId - Store ID
   * @param userId - User ID (requester)
   * @param requestId - Change request ID
   * @returns Change request detail
   */
  async getRequest(storeId: string, userId: string, requestId: string) {
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
        'You must be a member of this store to view change requests',
      );
    }

    const request = await this.prisma.changeRequest.findUnique({
      where: { id: requestId },
      include: {
        shift: {
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
        createdBy: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        candidates: {
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

    if (!request) {
      throw new NotFoundException('Change request not found');
    }

    if (request.storeId !== storeId) {
      throw new ForbiddenException(
        'Change request does not belong to this store',
      );
    }

    // Workers can only see their own requests or requests they're candidates for
    if (membership.role === 'WORKER') {
      const isRequester = request.createdById === userId;
      const isCandidate = request.candidates.some(
        (c) => c.userId === userId,
      );

      if (!isRequester && !isCandidate) {
        throw new ForbiddenException(
          'You can only view your own change requests or requests you are a candidate for',
        );
      }
    }

    return request;
  }

  /**
   * Cancel a change request
   * @param storeId - Store ID
   * @param userId - User ID (requester)
   * @param requestId - Change request ID
   * @returns Cancelled change request
   */
  async cancelRequest(storeId: string, userId: string, requestId: string) {
    const request = await this.prisma.changeRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Change request not found');
    }

    if (request.storeId !== storeId) {
      throw new ForbiddenException(
        'Change request does not belong to this store',
      );
    }

    if (request.createdById !== userId) {
      throw new ForbiddenException(
        'You can only cancel your own change requests',
      );
    }

    if (request.status !== ChangeRequestStatus.PENDING) {
      throw new BadRequestException(
        'Only pending change requests can be cancelled',
      );
    }

    const updated = await this.prisma.changeRequest.update({
      where: { id: requestId },
      data: {
        status: ChangeRequestStatus.CANCELED,
      },
      include: {
        shift: {
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
        createdBy: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    // Log audit
    await this.auditService.log(
      storeId,
      userId,
      'CHANGE_REQUEST_CANCELED',
      'ChangeRequest',
      requestId,
      { status: request.status },
      { status: ChangeRequestStatus.CANCELED },
    );

    return updated;
  }

  /**
   * Approve a change request
   * @param storeId - Store ID
   * @param userId - User ID (reviewer, must be OWNER or MANAGER)
   * @param requestId - Change request ID
   * @param approveDto - Approval data
   * @returns Approved change request and updated shifts
   */
  async approveRequest(
    storeId: string,
    userId: string,
    requestId: string,
    approveDto: ApproveChangeRequestDto,
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
        'You must be a member of this store to approve change requests',
      );
    }

    if (
      membership.role !== 'OWNER' &&
      membership.role !== 'MANAGER'
    ) {
      throw new ForbiddenException(
        'Only OWNER and MANAGER can approve change requests',
      );
    }

    const request = await this.prisma.changeRequest.findUnique({
      where: { id: requestId },
      include: {
        shift: true,
      },
    });

    if (!request) {
      throw new NotFoundException('Change request not found');
    }

    if (request.storeId !== storeId) {
      throw new ForbiddenException(
        'Change request does not belong to this store',
      );
    }

    if (request.status !== ChangeRequestStatus.PENDING) {
      throw new BadRequestException(
        'Only pending change requests can be approved',
      );
    }

    // Type-specific validations
    if (request.type === ChangeRequestType.SHIFT_COVER_REQUEST) {
      if (!approveDto.chosenUserId) {
        throw new BadRequestException(
          'chosenUserId is required for COVER_REQUEST approval',
        );
      }

      // Verify chosen user is a candidate
      const candidate = await this.prisma.changeRequestCandidate.findUnique({
        where: {
          requestId_userId: {
            requestId,
            userId: approveDto.chosenUserId,
          },
        },
      });

      if (!candidate) {
        throw new BadRequestException(
          'chosenUserId must be a candidate for this cover request',
        );
      }
    }

    // For SWAP requests, verify both employees have agreed (via candidates)
    if (request.type === ChangeRequestType.SHIFT_SWAP_REQUEST) {
      if (!request.swapShiftId) {
        throw new BadRequestException('swapShiftId is required for SWAP_REQUEST');
      }

      const swapShift = await this.prisma.shift.findUnique({
        where: { id: request.swapShiftId },
      });

      if (!swapShift) {
        throw new NotFoundException('Swap shift not found');
      }

      // Check if both employees have agreed to the swap
      // The swap shift owner should have volunteered as a candidate
      const swapShiftOwnerCandidate = await this.prisma.changeRequestCandidate.findUnique({
        where: {
          requestId_userId: {
            requestId,
            userId: swapShift.userId,
          },
        },
      });

      // Also check if the original shift owner has agreed (they created the request, so they implicitly agree)
      // But we can also check if they've explicitly volunteered
      const originalShiftOwnerCandidate = await this.prisma.changeRequestCandidate.findUnique({
        where: {
          requestId_userId: {
            requestId,
            userId: request.shift.userId,
          },
        },
      });

      // For swap to proceed, the swap shift owner must have volunteered
      // The original shift owner created the request, so they implicitly agree
      // But we'll require explicit agreement from the swap shift owner
      if (!swapShiftOwnerCandidate) {
        throw new BadRequestException(
          'Both employees must agree to the swap. The swap shift owner has not yet agreed.',
        );
      }
    }

    // Execute approval in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Update request status
      const updatedRequest = await tx.changeRequest.update({
        where: { id: requestId },
        data: {
          status: ChangeRequestStatus.APPROVED,
          reviewedById: userId,
          reviewedAt: new Date(),
          effectiveAt: new Date(),
          decisionNote: approveDto.decisionNote,
        },
        include: {
          shift: {
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
          createdBy: {
            select: {
              id: true,
              email: true,
              name: true,
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

      let updatedShifts: any[] = [];

      // Apply changes based on type
      switch (request.type) {
        case ChangeRequestType.SHIFT_TIME_CHANGE: {
          const before = {
            startTime: request.shift.startTime,
            endTime: request.shift.endTime,
            breakMins: request.shift.breakMins,
          };

          const updatedShift = await tx.shift.update({
            where: { id: request.shiftId },
            data: {
              startTime: request.proposedStartTime!,
              endTime: request.proposedEndTime!,
              breakMins: request.proposedBreakMins ?? request.shift.breakMins,
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

          updatedShifts = [updatedShift];

          // Log shift update
          await this.auditService.log(
            storeId,
            userId,
            'SHIFT_UPDATED',
            'Shift',
            request.shiftId,
            before,
            {
              startTime: updatedShift.startTime,
              endTime: updatedShift.endTime,
              breakMins: updatedShift.breakMins,
            },
          );

          break;
        }

        case ChangeRequestType.SHIFT_DROP_REQUEST: {
          const before = {
            isCanceled: request.shift.isCanceled,
          };

          const updatedShift = await tx.shift.update({
            where: { id: request.shiftId },
            data: {
              isCanceled: true,
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

          updatedShifts = [updatedShift];

          // Log shift cancellation
          await this.auditService.log(
            storeId,
            userId,
            'SHIFT_CANCELED',
            'Shift',
            request.shiftId,
            before,
            { isCanceled: true },
          );

          break;
        }

        case ChangeRequestType.SHIFT_COVER_REQUEST: {
          const before = {
            userId: request.shift.userId,
          };

          const updatedShift = await tx.shift.update({
            where: { id: request.shiftId },
            data: {
              userId: approveDto.chosenUserId!,
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

          updatedShifts = [updatedShift];

          // Log shift reassignment
          await this.auditService.log(
            storeId,
            userId,
            'SHIFT_REASSIGNED',
            'Shift',
            request.shiftId,
            before,
            { userId: approveDto.chosenUserId },
          );

          break;
        }

        case ChangeRequestType.SHIFT_SWAP_REQUEST: {
          if (!request.swapShiftId) {
            throw new BadRequestException('swapShiftId is required for SWAP_REQUEST');
          }

          const swapShift = await tx.shift.findUnique({
            where: { id: request.swapShiftId },
          });

          if (!swapShift) {
            throw new NotFoundException('Swap shift not found');
          }

          const before1 = { userId: request.shift.userId };
          const before2 = { userId: swapShift.userId };

          // Swap user IDs
          const updatedShift1 = await tx.shift.update({
            where: { id: request.shiftId },
            data: {
              userId: swapShift.userId,
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

          const updatedShift2 = await tx.shift.update({
            where: { id: request.swapShiftId },
            data: {
              userId: request.shift.userId,
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

          updatedShifts = [updatedShift1, updatedShift2];

          // Log both shift updates
          await this.auditService.log(
            storeId,
            userId,
            'SHIFT_SWAPPED',
            'Shift',
            request.shiftId,
            before1,
            { userId: swapShift.userId },
          );

          await this.auditService.log(
            storeId,
            userId,
            'SHIFT_SWAPPED',
            'Shift',
            request.swapShiftId,
            before2,
            { userId: request.shift.userId },
          );

          break;
        }
      }

      // Notify request creator of approval
      try {
        await this.notificationsService.enqueueInAppNotification({
          storeId,
          userId: request.createdById,
          type: 'CHANGE_REQUEST_UPDATED',
          title: 'Change Request Approved',
          message: `Your ${request.type} request has been approved`,
          data: {
            requestId: request.id,
            shiftId: request.shiftId,
            type: request.type,
            status: 'APPROVED',
          },
        });
      } catch (error) {
        console.error('Failed to send notification:', error);
      }

      // Log request approval
      await this.auditService.log(
        storeId,
        userId,
        'CHANGE_REQUEST_APPROVED',
        'ChangeRequest',
        requestId,
        { status: ChangeRequestStatus.PENDING },
        { status: ChangeRequestStatus.APPROVED },
      );

      return {
        request: updatedRequest,
        shifts: updatedShifts,
      };
    });

    return result;
  }

  /**
   * Reject a change request
   * @param storeId - Store ID
   * @param userId - User ID (reviewer, must be OWNER or MANAGER)
   * @param requestId - Change request ID
   * @param rejectDto - Rejection data
   * @returns Rejected change request
   */
  async rejectRequest(
    storeId: string,
    userId: string,
    requestId: string,
    rejectDto: RejectChangeRequestDto,
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
        'You must be a member of this store to reject change requests',
      );
    }

    if (
      membership.role !== 'OWNER' &&
      membership.role !== 'MANAGER'
    ) {
      throw new ForbiddenException(
        'Only OWNER and MANAGER can reject change requests',
      );
    }

    const request = await this.prisma.changeRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Change request not found');
    }

    if (request.storeId !== storeId) {
      throw new ForbiddenException(
        'Change request does not belong to this store',
      );
    }

    if (request.status !== ChangeRequestStatus.PENDING) {
      throw new BadRequestException(
        'Only pending change requests can be rejected',
      );
    }

    const updated = await this.prisma.changeRequest.update({
      where: { id: requestId },
      data: {
        status: ChangeRequestStatus.REJECTED,
        reviewedById: userId,
        reviewedAt: new Date(),
        decisionNote: rejectDto.decisionNote,
      },
      include: {
        shift: {
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
        createdBy: {
          select: {
            id: true,
            email: true,
            name: true,
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

    // Notify request creator of rejection
    try {
      await this.notificationsService.enqueueInAppNotification({
        storeId,
        userId: updated.createdById,
        type: 'CHANGE_REQUEST_UPDATED',
        title: 'Change Request Rejected',
        message: `Your ${updated.type} request has been rejected${updated.decisionNote ? ': ' + updated.decisionNote : ''}`,
        data: {
          requestId: updated.id,
          shiftId: updated.shiftId,
          type: updated.type,
          status: 'REJECTED',
        },
      });
    } catch (error) {
      console.error('Failed to send notification:', error);
    }

    // Log audit
    await this.auditService.log(
      storeId,
      userId,
      'CHANGE_REQUEST_REJECTED',
      'ChangeRequest',
      requestId,
      { status: ChangeRequestStatus.PENDING },
      { status: ChangeRequestStatus.REJECTED },
    );

    return updated;
  }
}
