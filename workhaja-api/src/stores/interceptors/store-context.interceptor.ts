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
        console.error('[StoreContextInterceptor] No user found in request');
        throw new ForbiddenException('Authentication required');
      }

      // Log for debugging
      console.log(`[StoreContextInterceptor] Checking membership: userId=${user.id}, email=${user.email}, storeId=${storeId}`);
      console.log(`[StoreContextInterceptor] Request cookies:`, request.cookies);
      console.log(`[StoreContextInterceptor] Request headers:`, {
        authorization: request.headers?.authorization,
        cookie: request.headers?.cookie,
      });

      // Find membership for this user and store
      const membership = await this.prisma.membership.findUnique({
        where: {
          userId_storeId: {
            userId: user.id,
            storeId: storeId,
          },
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

      if (!membership) {
        // Check if user exists in database
        const userExists = await this.prisma.user.findUnique({
          where: { id: user.id },
        });
        
        // Check if store exists
        const storeExists = await this.prisma.store.findUnique({
          where: { id: storeId },
        });

        // List all memberships for this user
        const allMemberships = await this.prisma.membership.findMany({
          where: { userId: user.id },
          include: {
            store: {
              select: { id: true, name: true },
            },
          },
        });

        console.error(`[StoreContextInterceptor] Membership not found:`);
        console.error(`  - userId: ${user.id}`);
        console.error(`  - user.email: ${user.email}`);
        console.error(`  - storeId: ${storeId}`);
        console.error(`  - user exists in DB: ${!!userExists}`);
        console.error(`  - store exists in DB: ${!!storeExists}`);
        console.error(`  - user's memberships:`, allMemberships.map(m => ({
          storeId: m.storeId,
          storeName: m.store.name,
          role: m.role,
        })));

        throw new ForbiddenException(
          'Access denied: You are not a member of this store',
        );
      }

      console.log(`[StoreContextInterceptor] Membership found: role=${membership.role}, userId=${membership.userId}, storeId=${membership.storeId}`);

      // Inject storeId and role into request.user
      request.user.storeId = storeId;
      request.user.role = membership.role;
      
      // Store membership object for permission checks
      request.membership = membership;
    }

    return next.handle();
  }
}

