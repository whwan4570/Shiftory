import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { StoresService } from './stores.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { CreateMembershipDto } from './dto/create-membership.dto';
import { UpdateMembershipDto } from './dto/update-membership.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequestUser } from '../auth/strategies/jwt.strategy';
import { StoreContextInterceptor } from './interceptors/store-context.interceptor';
import { Role } from '@prisma/client';

/**
 * StoresController handles store-related endpoints.
 */
@Controller('stores')
@UseGuards(JwtAuthGuard)
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  /**
   * Create a new store
   * POST /stores
   * Headers: Authorization: Bearer <token>
   * Body: { name, timezone? }
   * Returns: Store object
   * The creator is automatically assigned as OWNER
   */
  @Post()
  async createStore(
    @CurrentUser() user: RequestUser,
    @Body() createStoreDto: CreateStoreDto,
  ) {
    return this.storesService.createStore(user.id, createStoreDto);
  }

  /**
   * Get all stores where the current user is a member
   * GET /stores
   * Headers: Authorization: Bearer <token>
   * Returns: List of stores with user's role in each
   */
  @Get()
  async getStores(@CurrentUser() user: RequestUser) {
    return this.storesService.getUserStores(user.id);
  }

  /**
   * Update a store
   * PUT /stores/:storeId
   * Headers: Authorization: Bearer <token>
   * Body: { name?, timezone?, location?, specialCode? }
   * Requires: OWNER role in the store
   * Returns: Updated store
   */
  @Put(':storeId')
  @UseInterceptors(StoreContextInterceptor)
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER)
  async updateStore(
    @CurrentUser() user: RequestUser,
    @Param('storeId') storeId: string,
    @Body() updateStoreDto: UpdateStoreDto,
  ) {
    return this.storesService.updateStore(storeId, user.id, updateStoreDto);
  }

  /**
   * Get current user's membership in a specific store
   * GET /stores/:storeId/me
   * Headers: Authorization: Bearer <token>
   * Returns: Membership with role
   */
  @Get(':storeId/me')
  @UseInterceptors(StoreContextInterceptor)
  async getStoreMe(
    @CurrentUser() user: RequestUser,
    @Param('storeId') storeId: string,
  ) {
    return this.storesService.getMembership(user.id, storeId);
  }

  /**
   * Get all members of a store
   * GET /stores/:storeId/members
   * Headers: Authorization: Bearer <token>
   * Returns: List of members with their roles
   */
  @Get(':storeId/members')
  @UseInterceptors(StoreContextInterceptor)
  async getStoreMembers(@Param('storeId') storeId: string) {
    return this.storesService.getStoreMembers(storeId);
  }

  /**
   * Add a member to a store
   * POST /stores/:storeId/memberships
   * Headers: Authorization: Bearer <token>
   * Body: { email, role }
   * Requires: OWNER or MANAGER role in the store
   * Returns: Created membership
   */
  @Post(':storeId/memberships')
  @UseInterceptors(StoreContextInterceptor)
  @UseGuards(RolesGuard, PermissionsGuard)
  @Roles(Role.OWNER, Role.MANAGER)
  @RequirePermission('inviteMembers')
  async createMembership(
    @CurrentUser() user: RequestUser,
    @Param('storeId') storeId: string,
    @Body() createMembershipDto: CreateMembershipDto,
  ) {
    return this.storesService.createMembership(
      storeId,
      user.id,
      createMembershipDto,
    );
  }

  /**
   * Update a membership (change role or permissions)
   * PUT /stores/:storeId/memberships/:membershipId
   * Headers: Authorization: Bearer <token>
   * Body: { role?, permissions? }
   * Requires: OWNER role in the store
   * Returns: Updated membership
   */
  @Put(':storeId/memberships/:membershipId')
  @UseInterceptors(StoreContextInterceptor)
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER)
  async updateMembership(
    @CurrentUser() user: RequestUser,
    @Param('storeId') storeId: string,
    @Param('membershipId') membershipId: string,
    @Body() updateMembershipDto: UpdateMembershipDto,
  ) {
    return this.storesService.updateMembership(
      storeId,
      membershipId,
      user.id,
      updateMembershipDto,
    );
  }

  /**
   * Delete a membership (remove member from store)
   * DELETE /stores/:storeId/memberships/:membershipId
   * Headers: Authorization: Bearer <token>
   * Requires: OWNER role in the store
   * Returns: void
   */
  @Delete(':storeId/memberships/:membershipId')
  @UseInterceptors(StoreContextInterceptor)
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER)
  async deleteMembership(
    @CurrentUser() user: RequestUser,
    @Param('storeId') storeId: string,
    @Param('membershipId') membershipId: string,
  ) {
    await this.storesService.deleteMembership(storeId, membershipId, user.id);
    return { success: true };
  }

  /**
   * Admin ping endpoint for testing OWNER role access
   * GET /stores/:storeId/admin/ping
   * Headers: Authorization: Bearer <token>
   * Requires: OWNER role in the store
   * Returns: { message: 'pong', user, storeId, role }
   */
  @Get(':storeId/admin/ping')
  @UseInterceptors(StoreContextInterceptor)
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER)
  ping(
    @CurrentUser() user: RequestUser,
    @Param('storeId') storeId: string,
  ) {
    return {
      message: 'pong',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      storeId: storeId,
      timestamp: new Date().toISOString(),
    };
  }
}

