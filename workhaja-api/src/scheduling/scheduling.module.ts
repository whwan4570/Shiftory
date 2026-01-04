import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MonthsController } from './months.controller';
import { MonthsService } from './months.service';
import { ShiftsController } from './shifts.controller';
import { ShiftsService } from './shifts.service';
import { AvailabilityController } from './availability.controller';
import { AvailabilityService } from './availability.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

/**
 * SchedulingModule handles schedule month, shift, and availability operations
 */
@Module({
  imports: [PrismaModule, forwardRef(() => NotificationsModule), AuditLogModule],
  controllers: [
    MonthsController,
    ShiftsController,
    AvailabilityController,
  ],
  providers: [
    MonthsService,
    ShiftsService,
    AvailabilityService,
  ],
  exports: [MonthsService, ShiftsService, AvailabilityService],
})
export class SchedulingModule {}
