import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  NotFoundException,
  BadRequestException,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { TotpService } from './totp.service';
import { CheckinWithTotpDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequestUser } from '../auth/strategies/jwt.strategy';
import { StoreContextInterceptor } from '../stores/interceptors/store-context.interceptor';
import { TimeEntriesService } from '../time-entries/time-entries.service';
import { Role, TimeEntryStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * TOTP Controller handles QR code generation and TOTP-based check-in/check-out
 */
@Controller('stores/:storeId/totp')
@UseGuards(JwtAuthGuard)
@UseInterceptors(StoreContextInterceptor)
export class TotpController {
  constructor(
    private readonly totpService: TotpService,
    @Inject(forwardRef(() => TimeEntriesService))
    private readonly timeEntriesService: TimeEntriesService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Get QR code for check-in/check-out (for managers/owners to display)
   * GET /stores/:storeId/totp/qrcode
   * Requires: MANAGER or OWNER role
   * Returns: { qrCodeDataUrl: string, token: string, expiresAt: Date }
   */
  @Get('qrcode')
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER, Role.MANAGER)
  async getQRCode(
    @Param('storeId') storeId: string,
    @CurrentUser() user: RequestUser,
  ) {
    // Get store name
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: { name: true },
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    // Generate QR code with current token
    const result = await this.totpService.generateQRCodeWithToken(
      storeId,
      store.name,
    );

    return result;
  }

  /**
   * Check-in or check-out using TOTP token from QR code
   * POST /stores/:storeId/totp/checkin
   * Body: { token: string, type: 'CHECK_IN' | 'CHECK_OUT' }
   * Returns: Created time entry
   */
  @Post('checkin')
  async checkinWithTotp(
    @Param('storeId') storeId: string,
    @CurrentUser() user: RequestUser,
    @Body() checkinDto: CheckinWithTotpDto,
  ) {
    // Verify user is a member
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_storeId: {
          userId: user.id,
          storeId,
        },
      },
    });

    if (!membership) {
      throw new BadRequestException(
        'You must be a member of this store to check in/out',
      );
    }

    // Validate TOTP token
    const isValid = await this.totpService.validateToken(
      storeId,
      checkinDto.token,
    );

    if (!isValid) {
      throw new BadRequestException('Invalid or expired TOTP token');
    }

    // Create time entry using Prisma directly with auto-approval
    // TOTP verification is equivalent to location verification, so auto-approve
    const timeEntry = await this.prisma.timeEntry.create({
      data: {
        storeId,
        userId: user.id,
        type: checkinDto.type,
        method: 'QR', // TOTP-based check-in uses QR method
        status: TimeEntryStatus.APPROVED, // Auto-approve for TOTP-based check-in
        clientTimestamp: new Date(),
        locationVerified: true, // TOTP verification counts as location verification
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        shift: {
          select: {
            id: true,
            date: true,
            startTime: true,
            endTime: true,
          },
        },
      },
    });

    return timeEntry;
  }

  /**
   * Reset TOTP secret for a store (generates a new one)
   * POST /stores/:storeId/totp/reset
   * Requires: OWNER role
   * Returns: { message: string }
   */
  @Post('reset')
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER)
  async resetTotpSecret(
    @Param('storeId') storeId: string,
    @CurrentUser() user: RequestUser,
  ) {
    await this.totpService.resetSecret(storeId);
    return { message: 'TOTP secret has been reset. New QR codes will use the new secret.' };
  }
}
