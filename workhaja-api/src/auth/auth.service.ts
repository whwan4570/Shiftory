import { Injectable, UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService, SafeUser } from '../users/users.service';
import { StoresService } from '../stores/stores.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JoinDto } from './dto/join.dto';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * JWT payload structure
 */
export interface JwtPayload {
  sub: string; // User ID
  email: string;
}

/**
 * Authentication response with access token and store ID
 */
export interface AuthResponse {
  accessToken: string;
  storeId?: string; // Store ID created during registration
}

/**
 * AuthService handles authentication logic including registration and login.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly storesService: StoresService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Register a new user, optionally create a store, and return JWT token
   * @param registerDto - Registration data
   * @returns Access token and store ID (if store was created)
   */
  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    const { email, password, name, isOwner } = registerDto;
    // Default to true only if isOwner is undefined (for backward compatibility)
    // Explicit false means worker registration (no store creation)
    const shouldCreateStore = isOwner === undefined ? true : isOwner;

    // Create user (UsersService handles email uniqueness check)
    const user = await this.usersService.createUser(email, password, name);

    // Only create a store if shouldCreateStore is true
    if (!shouldCreateStore) {
      // Worker registration - no store created, they should join via invite code
      return this.generateToken(user);
    }

    // Generate a unique special code for the store
    const generateSpecialCode = (): string => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = 'STORE-';
      for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };

    // Create a store for the new user and assign them as OWNER
    // Retry if special code already exists (unlikely but possible)
    let store;
    let attempts = 0;
    while (!store && attempts < 5) {
      try {
        store = await this.storesService.createStore(user.id, {
          name: `${name}'s Store`,
          specialCode: generateSpecialCode(),
        });
      } catch (error) {
        if (error instanceof Error && error.message.includes('Special code already exists')) {
          attempts++;
          continue;
        }
        throw error;
      }
    }

    if (!store) {
      throw new Error('Failed to create store after multiple attempts');
    }

    // Generate and return JWT token with store ID
    return {
      ...this.generateToken(user),
      storeId: store.id,
    };
  }

  /**
   * Authenticate user with email and password
   * @param loginDto - Login credentials
   * @returns Access token
   * @throws UnauthorizedException if credentials are invalid
   */
  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const { email, password } = loginDto;

    // Find user by email
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Validate password
    const isPasswordValid = await this.usersService.validatePassword(
      password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Generate and return JWT token
    return this.generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  }

  /**
   * Join a store using an invite code
   * @param joinDto - Join data (invite code, email, password, name)
   * @returns Access token and store ID
   * @throws NotFoundException if store with invite code not found
   * @throws BadRequestException if user already exists or is already a member
   */
  async join(joinDto: JoinDto): Promise<AuthResponse> {
    const { inviteCode, email, password, name } = joinDto;

    // Find store by special code (invite code)
    const store = await this.prisma.store.findUnique({
      where: { specialCode: inviteCode.toUpperCase() },
    });

    if (!store) {
      throw new NotFoundException('Invalid invite code');
    }

    // Check if user already exists
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new BadRequestException('User with this email already exists. Please login instead.');
    }

    // Create user
    const user = await this.usersService.createUser(email, password, name);

    // Check if user is already a member (shouldn't happen, but just in case)
    const existingMembership = await this.prisma.membership.findUnique({
      where: {
        userId_storeId: {
          userId: user.id,
          storeId: store.id,
        },
      },
    });

    if (existingMembership) {
      throw new BadRequestException('You are already a member of this store');
    }

    // Add user to store as WORKER by default
    await this.prisma.membership.create({
      data: {
        userId: user.id,
        storeId: store.id,
        role: Role.WORKER,
        permissions: [],
      },
    });

    // Generate and return JWT token with store ID
    return {
      ...this.generateToken(user),
      storeId: store.id,
    };
  }

  /**
   * Get current user information by ID
   * @param userId - User ID from JWT
   * @returns User data without password
   * @throws UnauthorizedException if user not found
   */
  async getMe(userId: string): Promise<SafeUser> {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  /**
   * Generate JWT token for a user
   * @param user - User data
   * @returns Access token response
   */
  private generateToken(user: SafeUser): AuthResponse {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
    };

    return {
      accessToken: this.jwtService.sign(payload),
    };
  }
}
