import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { Request } from 'express';

/**
 * JWT Authentication Guard
 * Uses passport-jwt strategy to validate Bearer tokens.
 * Apply to routes that require authenticated users.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    
    // Log for debugging (only in development)
    if (process.env.NODE_ENV !== 'production') {
      console.log('[JwtAuthGuard] Checking authentication');
      console.log('[JwtAuthGuard] Cookies:', request.cookies);
      console.log('[JwtAuthGuard] Authorization header:', request.headers?.authorization);
    }
    
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (err || !user) {
      const request = context.switchToHttp().getRequest<Request>();
      // Always log errors, but reduce verbosity in production
      if (process.env.NODE_ENV !== 'production') {
        console.error('[JwtAuthGuard] Authentication failed:', {
          err: err?.message,
          info: info?.message,
          cookies: request.cookies,
          authorization: request.headers?.authorization,
        });
      } else {
        console.error('[JwtAuthGuard] Authentication failed:', err?.message || info?.message);
      }
      throw err || new UnauthorizedException('Authentication failed');
    }
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('[JwtAuthGuard] Authentication successful:', {
        userId: user.id,
        email: user.email,
      });
    }
    
    return user;
  }
}
