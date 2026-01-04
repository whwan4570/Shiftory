import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * AuditService handles audit logging for change requests and shifts
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Log an audit event
   * @param storeId - Store ID
   * @param actorId - User ID who performed the action
   * @param action - Action name (e.g., "CHANGE_REQUEST_CREATED")
   * @param entityType - Entity type (e.g., "ChangeRequest", "Shift")
   * @param entityId - Entity ID
   * @param before - State before change (optional)
   * @param after - State after change (optional)
   */
  async log(
    storeId: string,
    actorId: string,
    action: string,
    entityType: string,
    entityId: string,
    before?: any,
    after?: any,
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        storeId,
        actorUserId: actorId,
        action,
        entityType,
        entityId,
        before: before ? before : undefined,
        after: after ? after : undefined,
      },
    });
  }
}
