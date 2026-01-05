import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { UsersService } from '../../users/users.service';
import { JwtPayload } from '../auth.service';

/**
 * User object attached to request after JWT validation
 */
export interface RequestUser {
  id: string;
  email: string;
  name: string;
  // Role and storeId are injected by StoreContextInterceptor for store-scoped routes
  role?: string;
  storeId?: string;
}

/**
 * JWT Strategy for Passport authentication.
 * Validates JWT tokens and attaches user to request.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }

      // Extract JWT from cookie (preferred) or Authorization header (fallback for backward compatibility)
      super({
        jwtFromRequest: ExtractJwt.fromExtractors([
          (request: Request) => {
            // Try to get token from cookie first (auth_token is set by auth.controller)
            const cookieToken = request?.cookies?.['auth_token'];
            if (cookieToken) {
              console.log('[JwtStrategy] Token found in cookie');
              return cookieToken;
            }
            
            // Fallback to Authorization header for backward compatibility
            const authHeader = request?.headers?.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
              console.log('[JwtStrategy] Token found in Authorization header');
              return authHeader.substring(7);
            }
            
            console.warn('[JwtStrategy] No token found in cookie or Authorization header');
            console.warn('[JwtStrategy] Cookies:', request?.cookies);
            console.warn('[JwtStrategy] Headers:', {
              authorization: request?.headers?.authorization,
              cookie: request?.headers?.cookie,
            });
            return null;
          },
        ]),
        ignoreExpiration: false,
        secretOrKey: jwtSecret,
      });
  }

  /**
   * Validate JWT payload and return user object for request
   * @param payload - Decoded JWT payload
   * @returns User object to be attached to request
   * @throws UnauthorizedException if user not found
   */
  async validate(payload: JwtPayload): Promise<RequestUser> {
    const user = await this.usersService.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Return user object that will be attached to request.user
    // Note: role is not set here - it will be determined by Membership in future stages
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      // role is intentionally undefined at this stage
    };
  }
}
