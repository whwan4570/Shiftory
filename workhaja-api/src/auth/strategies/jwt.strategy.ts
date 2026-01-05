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
            // Try Authorization header first (more reliable for cross-origin)
            const authHeader = request?.headers?.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
              const token = authHeader.substring(7);
              if (process.env.NODE_ENV !== 'production') {
                console.log('[JwtStrategy] Token found in Authorization header');
              }
              return token;
            }
            
            // Fallback to cookie (for same-origin or when header is not available)
            const cookieToken = request?.cookies?.['auth_token'];
            if (cookieToken) {
              if (process.env.NODE_ENV !== 'production') {
                console.log('[JwtStrategy] Token found in cookie');
              }
              return cookieToken;
            }
            
            if (process.env.NODE_ENV !== 'production') {
              console.warn('[JwtStrategy] No token found in Authorization header or cookie');
              console.warn('[JwtStrategy] Cookies:', request?.cookies);
              console.warn('[JwtStrategy] Headers:', {
                authorization: request?.headers?.authorization,
                cookie: request?.headers?.cookie,
              });
            }
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
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[JwtStrategy] Validating JWT payload: sub=${payload.sub}, email=${payload.email}`);
    }
    
    const user = await this.usersService.findById(payload.sub);

    if (!user) {
      console.error(`[JwtStrategy] User not found: id=${payload.sub}`);
      throw new UnauthorizedException('User not found');
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[JwtStrategy] User validated: id=${user.id}, email=${user.email}, name=${user.name}`);
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
