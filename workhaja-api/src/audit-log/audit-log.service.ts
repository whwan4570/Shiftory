import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type EntityType =
  | 'SHIFT'
  | 'MONTH'
  | 'CHANGE_REQUEST'
  | 'TIME_ENTRY'
  | 'DOCUMENT'
  | 'SUBMISSION'
  | 'SETTINGS'
  | 'MEMBERSHIP';

export type Action =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'PUBLISH'
  | 'APPROVE'
  | 'REJECT'
  | 'ACK'
  | 'SUBMIT'
  | 'CANCEL'
  | 'RESET';

export interface AuditLogData {
  storeId: string;
  actorUserId: string;
  entityType: EntityType;
  entityId?: string;
  action: Action;
  before?: any;
  after?: any;
  metadata?: any;
}

/**
 * AuditLogService handles audit logging for all critical events
 */
@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create an audit log entry
   */
  async log(data: AuditLogData): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          storeId: data.storeId,
          actorUserId: data.actorUserId,
          entityType: data.entityType,
          entityId: data.entityId || null,
          action: data.action,
          before: data.before ? JSON.parse(JSON.stringify(data.before)) : null,
          after: data.after ? JSON.parse(JSON.stringify(data.after)) : null,
          metadata: data.metadata ? JSON.parse(JSON.stringify(data.metadata)) : null,
        },
      });
    } catch (error) {
      // Log error but don't fail the operation
      console.error('Failed to create audit log:', error);
    }
  }

  /**
   * Get audit logs for a store
   */
  async getLogs(
    storeId: string,
    options?: {
      entityType?: EntityType;
      entityId?: string;
      actorUserId?: string;
      limit?: number;
      cursor?: string;
    },
  ) {
    const limit = Math.min(options?.limit || 50, 100);
    const where: any = {
      storeId,
    };

    if (options?.entityType) {
      where.entityType = options.entityType;
    }

    if (options?.entityId) {
      where.entityId = options.entityId;
    }

    if (options?.actorUserId) {
      where.actorUserId = options.actorUserId;
    }

    if (options?.cursor) {
      try {
        const [createdAt, id] = options.cursor.split('|');
        where.OR = [
          {
            createdAt: { lt: new Date(createdAt) },
          },
          {
            createdAt: new Date(createdAt),
            id: { lt: id },
          },
        ];
      } catch {
        // Invalid cursor, ignore
      }
    }

    const logs = await this.prisma.auditLog.findMany({
      where,
      take: limit + 1,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: {
        actor: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    const hasMore = logs.length > limit;
    const items = hasMore ? logs.slice(0, limit) : logs;

    const nextCursor =
      hasMore && items.length > 0
        ? `${items[items.length - 1].createdAt.toISOString()}|${items[items.length - 1].id}`
        : null;

    return {
      items,
      nextCursor,
    };
  }
}

