import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { TimeEntriesService } from './time-entries.service';
import { CreateTimeEntryDto } from './dto/create-time-entry.dto';
import { ReviewTimeEntryDto } from './dto/review-time-entry.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequestUser } from '../auth/strategies/jwt.strategy';
import { StoreContextInterceptor } from '../stores/interceptors/store-context.interceptor';
import { TimeEntryStatus, Role } from '@prisma/client';

/**
 * TimeEntriesController handles time entry (check-in/check-out) endpoints
 */
@Controller('stores/:storeId/time-entries')
@UseGuards(JwtAuthGuard)
@UseInterceptors(StoreContextInterceptor)
export class TimeEntriesController {
  constructor(private readonly timeEntriesService: TimeEntriesService) {}

  /**
   * Create a time entry (check-in or check-out)
   * POST /stores/:storeId/time-entries
   * Headers: Authorization: Bearer <token>
   * Body: { type, shiftId?, latitude?, longitude?, clientTimestamp? }
   * Returns: Created time entry
   */
  @Post()
  async createTimeEntry(
    @Param('storeId') storeId: string,
    @CurrentUser() user: RequestUser,
    @Body() createDto: CreateTimeEntryDto,
  ) {
    return this.timeEntriesService.createTimeEntry(
      storeId,
      user.id,
      createDto,
    );
  }

  /**
   * List time entries
   * GET /stores/:storeId/time-entries?userId=&status=&flaggedOnly=
   * Headers: Authorization: Bearer <token>
   * Query params: userId (optional, managers can filter), status (optional), flaggedOnly (optional)
   * Returns: List of time entries
   * Workers can only view their own entries
   * Managers/Owners can view all entries
   */
  @Get()
  async listTimeEntries(
    @Param('storeId') storeId: string,
    @CurrentUser() user: RequestUser,
    @Query('userId') filterUserId?: string,
    @Query('status') status?: TimeEntryStatus,
    @Query('flaggedOnly') flaggedOnly?: string,
  ) {
    const flaggedOnlyBool = flaggedOnly === 'true';
    return this.timeEntriesService.listTimeEntries(
      storeId,
      user.id,
      filterUserId,
      status,
      flaggedOnlyBool,
    );
  }

  /**
   * Get pending time entries (for managers/owners to review)
   * GET /stores/:storeId/time-entries/pending?flaggedOnly=
   * Headers: Authorization: Bearer <token>
   * Requires: MANAGER or OWNER role
   * Query params: flaggedOnly (optional) - show only entries with flags
   * Returns: List of pending time entries
   */
  @Get('pending')
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER, Role.MANAGER)
  async getPendingTimeEntries(
    @Param('storeId') storeId: string,
    @CurrentUser() user: RequestUser,
    @Query('flaggedOnly') flaggedOnly?: string,
  ) {
    const flaggedOnlyBool = flaggedOnly === 'true';
    return this.timeEntriesService.getPendingTimeEntries(storeId, user.id, flaggedOnlyBool);
  }

  /**
   * Review (approve/reject) a time entry
   * PUT /stores/:storeId/time-entries/:timeEntryId/review
   * Headers: Authorization: Bearer <token>
   * Body: { status, reviewNote? }
   * Requires: MANAGER or OWNER role
   * Returns: Updated time entry
   */
  @Put(':timeEntryId/review')
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER, Role.MANAGER)
  async reviewTimeEntry(
    @Param('storeId') storeId: string,
    @Param('timeEntryId') timeEntryId: string,
    @CurrentUser() user: RequestUser,
    @Body() reviewDto: ReviewTimeEntryDto,
  ) {
    return this.timeEntriesService.reviewTimeEntry(
      storeId,
      timeEntryId,
      user.id,
      reviewDto,
    );
  }
}

