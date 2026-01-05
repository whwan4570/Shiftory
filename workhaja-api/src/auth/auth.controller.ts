import { Controller, Post, Get, Body, UseGuards, Res } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JoinDto } from './dto/join.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { RequestUser } from './strategies/jwt.strategy';

/**
 * AuthController handles authentication endpoints.
 * Keeps controller thin - business logic is in AuthService.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Register a new user
   * POST /auth/register
   * Body: { email, password, name }
   * Returns: { storeId }
   * Sets JWT token as HttpOnly cookie
   * Automatically creates a store and assigns the user as OWNER
   */
  @Post('register')
  async register(@Body() registerDto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.register(registerDto);
    
    // Set JWT token as HttpOnly cookie
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
    const expiresInDays = expiresIn.includes('d') ? parseInt(expiresIn.replace('d', '')) : 7;
    const maxAge = expiresInDays * 24 * 60 * 60 * 1000; // Convert days to milliseconds
    
    // For cross-origin requests (Railway), we need sameSite: 'none' with secure: true
    // But for same-origin, 'lax' is safer. We'll use 'none' in production for Railway compatibility
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('auth_token', result.accessToken, {
      httpOnly: true,
      secure: isProduction, // Use secure cookies in production (HTTPS only)
      sameSite: isProduction ? 'none' : 'lax', // 'none' for cross-origin in production, 'lax' for same-origin in dev
      maxAge: maxAge,
      path: '/',
    });

    // Return response without token (for backward compatibility, but token is in cookie)
    return {
      storeId: result.storeId,
    };
  }

  /**
   * Login with email and password
   * POST /auth/login
   * Body: { email, password }
   * Returns: { success: true }
   * Sets JWT token as HttpOnly cookie
   */
  @Post('login')
  async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(loginDto);
    
    // Set JWT token as HttpOnly cookie
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
    const expiresInDays = expiresIn.includes('d') ? parseInt(expiresIn.replace('d', '')) : 7;
    const maxAge = expiresInDays * 24 * 60 * 60 * 1000; // Convert days to milliseconds
    
    // For cross-origin requests (Railway), we need sameSite: 'none' with secure: true
    // But for same-origin, 'lax' is safer. We'll use 'none' in production for Railway compatibility
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('auth_token', result.accessToken, {
      httpOnly: true,
      secure: isProduction, // Use secure cookies in production (HTTPS only)
      sameSite: isProduction ? 'none' : 'lax', // 'none' for cross-origin in production, 'lax' for same-origin in dev
      maxAge: maxAge,
      path: '/',
    });

    // Return success response (token is in cookie)
    return {
      success: true,
    };
  }

  /**
   * Logout (clear auth cookie)
   * POST /auth/logout
   * Returns: { success: true }
   */
  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Clear cookie with all possible configurations to ensure it's removed
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? ('none' as const) : ('lax' as const),
      path: '/',
      maxAge: 0, // Expire immediately
    };
    
    res.clearCookie('auth_token', cookieOptions);
    
    // Also try clearing with different sameSite values in case of mismatch
    if (isProduction) {
      res.clearCookie('auth_token', {
        ...cookieOptions,
        sameSite: 'lax' as const,
      });
    } else {
      res.clearCookie('auth_token', {
        ...cookieOptions,
        sameSite: 'none' as const,
        secure: true,
      });
    }

    return {
      success: true,
    };
  }

  /**
   * Join a store using an invite code
   * POST /auth/join
   * Body: { inviteCode, email, password, name }
   * Returns: { storeId }
   * Sets JWT token as HttpOnly cookie
   * Creates a new user account and adds them to the store as WORKER
   */
  @Post('join')
  async join(@Body() joinDto: JoinDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.join(joinDto);
    
    // Set JWT token as HttpOnly cookie
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
    const expiresInDays = expiresIn.includes('d') ? parseInt(expiresIn.replace('d', '')) : 7;
    const maxAge = expiresInDays * 24 * 60 * 60 * 1000; // Convert days to milliseconds
    
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('auth_token', result.accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: maxAge,
      path: '/',
    });

    // Return response without token (token is in cookie)
    return {
      storeId: result.storeId,
    };
  }

  /**
   * Get current authenticated user info
   * GET /auth/me
   * Headers: Authorization: Bearer <token>
   * Returns: User object (without password)
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser() user: RequestUser) {
    return this.authService.getMe(user.id);
  }
}
