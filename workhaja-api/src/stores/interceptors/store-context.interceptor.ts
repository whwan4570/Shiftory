import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestUser } from '../../auth/strategies/jwt.strategy';

/**
 * StoreContextInterceptor injects storeId and role into request.user
 * for routes that include :storeId parameter.
 *
 * This allows RolesGuard to work with store-scoped roles.
 */
@Injectable()
export class StoreContextInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const user: RequestUser = request.user;
    const storeId = request.params?.storeId;

    // Only process if storeId is present in route params
    if (storeId) {
      if (!user) {
        throw new ForbiddenException('Authentication required');
      }

      // Find membership for this user and store
      const membership = await this.prisma.membership.findUnique({
        where: {
          userId_storeId: {
            userId: user.id,
            storeId: storeId,
          },
        },
      });

      if (!membership) {
        // Log for debugging
        console.error(`[StoreContextInterceptor] Membership not found: userId=${user.id}, storeId=${storeId}`);
        throw new ForbiddenException(
          'Access denied: You are not a member of this store',
        );
      }

      // Inject storeId and role into request.user
      request.user.storeId = storeId;
      request.user.role = membership.role;
      
      // Store membership object for permission checks
      request.membership = membership;
    }

    return next.handle();
  }
}

