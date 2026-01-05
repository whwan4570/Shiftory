import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { CreateMembershipDto } from './dto/create-membership.dto';
import { Role } from '@prisma/client';

/**
 * Store data returned in responses
 */
export interface StoreResponse {
  id: string;
  name: string;
  timezone: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  specialCode: string;
  createdAt: Date;
  updatedAt: Date;
  role?: Role; // User's role in this store (for list endpoints)
}

/**
 * Membership data returned in responses
 */
export interface MembershipResponse {
  id: string;
  userId: string;
  storeId: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

/**
 * StoresService handles all store-related operations.
 */
@Injectable()
export class StoresService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Create a new store and assign the creator as OWNER
   * @param userId - ID of the user creating the store
   * @param createStoreDto - Store creation data
   * @returns Created store
   */
  async createStore(
    userId: string,
    createStoreDto: CreateStoreDto,
  ): Promise<StoreResponse> {
    const { name, timezone = 'America/New_York', location, specialCode } = createStoreDto;

    // Check if specialCode already exists
    const existingStore = await this.prisma.store.findUnique({
      where: { specialCode },
    });

    if (existingStore) {
      throw new BadRequestException('Special code already exists. Please choose a different code.');
    }

    // Create store and membership in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create store
      const store = await tx.store.create({
        data: {
          name,
          timezone,
          location,
          specialCode,
        },
      });

      // Create OWNER membership
      await tx.membership.create({
        data: {
          userId,
          storeId: store.id,
          role: Role.OWNER,
        },
      });

      return store;
    });

    return {
      id: result.id,
      name: result.name,
      timezone: result.timezone,
      location: (result as any).location || undefined,
      specialCode: (result as any).specialCode || 'N/A',
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };
  }

  /**
   * Get all stores where the user is a member
   * @param userId - User ID
   * @returns List of stores with user's role
   */
  async getUserStores(userId: string): Promise<StoreResponse[]> {
    try {
      const memberships = await this.prisma.membership.findMany({
        where: {
          userId,
        },
        include: {
          store: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return memberships.map((membership) => {
        // Safely access specialCode - it may not exist if migration hasn't completed
        const specialCode = (membership.store as any).specialCode || 'N/A';
        return {
          id: membership.store.id,
          name: membership.store.name,
          timezone: membership.store.timezone,
          location: (membership.store as any).location || undefined,
          latitude: (membership.store as any).latitude || undefined,
          longitude: (membership.store as any).longitude || undefined,
          specialCode,
          createdAt: membership.store.createdAt,
          updatedAt: membership.store.updatedAt,
          role: membership.role,
        };
      });
    } catch (error) {
      console.error('Error in getUserStores:', error);
      throw error;
    }
  }

  /**
   * Get store by ID
   * @param storeId - Store ID
   * @returns Store
   * @throws NotFoundException if store not found
   */
  async getStoreById(storeId: string): Promise<StoreResponse> {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    return {
      id: store.id,
      name: store.name,
      timezone: store.timezone,
      location: (store as any).location || undefined,
      latitude: (store as any).latitude || undefined,
      longitude: (store as any).longitude || undefined,
      specialCode: (store as any).specialCode || 'N/A',
      createdAt: store.createdAt,
      updatedAt: store.updatedAt,
    };
  }

  /**
   * Update a store
   * @param storeId - Store ID
   * @param userId - User ID (must be OWNER)
   * @param updateStoreDto - Store update data
   * @returns Updated store
   * @throws NotFoundException if store not found
   * @throws ForbiddenException if user is not OWNER
   * @throws BadRequestException if specialCode already exists
   */
  async updateStore(
    storeId: string,
    userId: string,
    updateStoreDto: UpdateStoreDto,
  ): Promise<StoreResponse> {
    // Verify store exists
    await this.getStoreById(storeId);

    // Verify user is OWNER
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_storeId: {
          userId,
          storeId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('You must be a member of this store to update it');
    }

    if (membership.role !== Role.OWNER) {
      throw new ForbiddenException('Only OWNER can update store information');
    }

    // Check if specialCode is being updated and if it already exists
    if (updateStoreDto.specialCode) {
      const existingStore = await this.prisma.store.findUnique({
        where: { specialCode: updateStoreDto.specialCode },
      });

      if (existingStore && existingStore.id !== storeId) {
        throw new BadRequestException('Special code already exists. Please choose a different code.');
      }
    }

    // Update store
    const updatedStore = await this.prisma.store.update({
      where: { id: storeId },
      data: {
        ...(updateStoreDto.name && { name: updateStoreDto.name }),
        ...(updateStoreDto.timezone && { timezone: updateStoreDto.timezone }),
        ...(updateStoreDto.location !== undefined && { location: updateStoreDto.location }),
        ...(updateStoreDto.latitude !== undefined && { latitude: updateStoreDto.latitude }),
        ...(updateStoreDto.longitude !== undefined && { longitude: updateStoreDto.longitude }),
        ...(updateStoreDto.specialCode && { specialCode: updateStoreDto.specialCode }),
      },
    });

    return {
      id: updatedStore.id,
      name: updatedStore.name,
      timezone: updatedStore.timezone,
      location: (updatedStore as any).location || undefined,
      specialCode: (updatedStore as any).specialCode || 'N/A',
      latitude: (updatedStore as any).latitude || undefined,
      longitude: (updatedStore as any).longitude || undefined,
      createdAt: updatedStore.createdAt,
      updatedAt: updatedStore.updatedAt,
    };
  }

  /**
   * Add a user to a store as a member
   * @param storeId - Store ID
   * @param userId - ID of the user adding the member (must be OWNER or MANAGER)
   * @param createMembershipDto - Membership creation data
   * @returns Created membership
   * @throws NotFoundException if user not found
   * @throws BadRequestException if user is already a member
   * @throws ForbiddenException if requester doesn't have permission
   */
  async createMembership(
    storeId: string,
    userId: string,
    createMembershipDto: CreateMembershipDto,
  ): Promise<MembershipResponse> {
    const { email, role } = createMembershipDto;

    // Verify store exists
    await this.getStoreById(storeId);

    // Find user by email
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user is already a member
    const existingMembership = await this.prisma.membership.findUnique({
      where: {
        userId_storeId: {
          userId: user.id,
          storeId: storeId,
        },
      },
    });

    if (existingMembership) {
      throw new BadRequestException('User is already a member of this store');
    }

    // Verify requester has permission (OWNER or MANAGER)
    const requesterMembership = await this.prisma.membership.findUnique({
      where: {
        userId_storeId: {
          userId: userId,
          storeId: storeId,
        },
      },
    });

    if (!requesterMembership) {
      throw new ForbiddenException(
        'You must be a member of this store to add members',
      );
    }

    if (
      requesterMembership.role !== Role.OWNER &&
      requesterMembership.role !== Role.MANAGER
    ) {
      throw new ForbiddenException(
        'Only OWNER and MANAGER can add members to the store',
      );
    }

    // Prepare permissions: OWNER gets all permissions (undefined), MANAGER gets provided permissions, WORKER gets none (undefined)
    let permissions: string[] | undefined = undefined;
    if (role === Role.MANAGER) {
      // For MANAGER, use provided permissions or empty array
      permissions = createMembershipDto.permissions || [];
    }
    // OWNER and WORKER don't need permissions (OWNER has all, WORKER has none)

    // Create membership
    const membership = await this.prisma.membership.create({
      data: {
        userId: user.id,
        storeId: storeId,
        role: role,
        permissions: permissions,
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

    return {
      id: membership.id,
      userId: membership.userId,
      storeId: membership.storeId,
      role: membership.role,
      createdAt: membership.createdAt,
      updatedAt: membership.updatedAt,
      user: {
        id: membership.user.id,
        email: membership.user.email,
        name: membership.user.name,
      },
    };
  }

  /**
   * Get user's membership in a specific store
   * @param userId - User ID
   * @param storeId - Store ID
   * @returns Membership with user and store info
   * @throws NotFoundException if membership not found
   */
  async getMembership(
    userId: string,
    storeId: string,
  ): Promise<MembershipResponse> {
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_storeId: {
          userId: userId,
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
      throw new NotFoundException('Membership not found');
    }

    return {
      id: membership.id,
      userId: membership.userId,
      storeId: membership.storeId,
      role: membership.role,
      createdAt: membership.createdAt,
      updatedAt: membership.updatedAt,
      user: {
        id: membership.user.id,
        email: membership.user.email,
        name: membership.user.name,
      },
    };
  }

  /**
   * Get all members of a store
   * @param storeId - Store ID
   * @returns List of memberships with user info
   */
  async getStoreMembers(storeId: string): Promise<MembershipResponse[]> {
    // Verify store exists
    await this.getStoreById(storeId);

    const memberships = await this.prisma.membership.findMany({
      where: {
        storeId: storeId,
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    return memberships.map((membership) => ({
      id: membership.id,
      userId: membership.userId,
      storeId: membership.storeId,
      role: membership.role,
      createdAt: membership.createdAt,
      updatedAt: membership.updatedAt,
      user: {
        id: membership.user.id,
        email: membership.user.email,
        name: membership.user.name,
      },
    }));
  }

  /**
   * Update a membership (change role or permissions)
   * @param storeId - Store ID
   * @param membershipId - Membership ID
   * @param userId - ID of the user updating the membership (must be OWNER)
   * @param updateMembershipDto - Membership update data
   * @returns Updated membership
   * @throws NotFoundException if membership not found
   * @throws ForbiddenException if requester is not OWNER
   */
  async updateMembership(
    storeId: string,
    membershipId: string,
    userId: string,
    updateMembershipDto: { role?: Role; permissions?: string[] },
  ): Promise<MembershipResponse> {
    // Verify store exists
    await this.getStoreById(storeId);

    // Find membership
    const membership = await this.prisma.membership.findUnique({
      where: { id: membershipId },
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
      throw new NotFoundException('Membership not found');
    }

    if (membership.storeId !== storeId) {
      throw new NotFoundException('Membership does not belong to this store');
    }

    // Verify requester is OWNER
    const requesterMembership = await this.prisma.membership.findUnique({
      where: {
        userId_storeId: {
          userId: userId,
          storeId: storeId,
        },
      },
    });

    if (!requesterMembership || requesterMembership.role !== Role.OWNER) {
      throw new ForbiddenException('Only OWNER can update memberships');
    }

    // Prepare update data
    const updateData: any = {};
    if (updateMembershipDto.role !== undefined) {
      updateData.role = updateMembershipDto.role;
    }
    if (updateMembershipDto.permissions !== undefined) {
      // Only set permissions for MANAGER role
      if (updateMembershipDto.role === Role.MANAGER || (!updateMembershipDto.role && membership.role === Role.MANAGER)) {
        updateData.permissions = updateMembershipDto.permissions;
      } else {
        // OWNER and WORKER don't need permissions
        updateData.permissions = null;
      }
    }

    // Update membership
    const updatedMembership = await this.prisma.membership.update({
      where: { id: membershipId },
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

    return {
      id: updatedMembership.id,
      userId: updatedMembership.userId,
      storeId: updatedMembership.storeId,
      role: updatedMembership.role,
      createdAt: updatedMembership.createdAt,
      updatedAt: updatedMembership.updatedAt,
      user: {
        id: updatedMembership.user.id,
        email: updatedMembership.user.email,
        name: updatedMembership.user.name,
      },
    };
  }

  /**
   * Delete a store (only OWNER can delete)
   * @param storeId - Store ID
   * @param userId - User ID (must be OWNER)
   * @returns void
   * @throws NotFoundException if store not found
   * @throws ForbiddenException if user is not OWNER
   */
  async deleteStore(storeId: string, userId: string): Promise<void> {
    // Verify store exists
    const store = await this.getStoreById(storeId);

    // Verify user is OWNER
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_storeId: {
          userId,
          storeId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('You must be a member of this store to delete it');
    }

    if (membership.role !== Role.OWNER) {
      throw new ForbiddenException('Only OWNER can delete a store');
    }

    // Delete store (Prisma will handle cascading deletes based on schema relations)
    await this.prisma.store.delete({
      where: { id: storeId },
    });
  }

  /**
   * Delete a membership (remove member from store)
   * @param storeId - Store ID
   * @param membershipId - Membership ID
   * @param userId - ID of the user deleting the membership (must be OWNER)
   * @throws NotFoundException if membership not found
   * @throws ForbiddenException if requester is not OWNER
   * @throws BadRequestException if trying to remove the last OWNER
   */
  async deleteMembership(
    storeId: string,
    membershipId: string,
    userId: string,
  ): Promise<void> {
    // Verify store exists
    await this.getStoreById(storeId);

    // Find membership
    const membership = await this.prisma.membership.findUnique({
      where: { id: membershipId },
    });

    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    if (membership.storeId !== storeId) {
      throw new NotFoundException('Membership does not belong to this store');
    }

    // Verify requester is OWNER
    const requesterMembership = await this.prisma.membership.findUnique({
      where: {
        userId_storeId: {
          userId: userId,
          storeId: storeId,
        },
      },
    });

    if (!requesterMembership || requesterMembership.role !== Role.OWNER) {
      throw new ForbiddenException('Only OWNER can remove members');
    }

    // Prevent removing the last OWNER
    if (membership.role === Role.OWNER) {
      const ownerCount = await this.prisma.membership.count({
        where: {
          storeId: storeId,
          role: Role.OWNER,
        },
      });

      if (ownerCount <= 1) {
        throw new BadRequestException('Cannot remove the last OWNER from the store');
      }
    }

    // Delete membership
    await this.prisma.membership.delete({
      where: { id: membershipId },
    });
  }
}

