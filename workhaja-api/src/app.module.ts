import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { StoresModule } from './stores/stores.module';
import { SchedulingModule } from './scheduling/scheduling.module';
import { ChangeRequestsModule } from './change-requests/change-requests.module';
import { LaborRulesModule } from './labor-rules/labor-rules.module';
import { TimeSummaryModule } from './time-summary/time-summary.module';
import { DocumentsModule } from './documents/documents.module';
import { NotificationsModule } from './notifications/notifications.module';
import { UploadsModule } from './uploads/uploads.module';
import { TimeEntriesModule } from './time-entries/time-entries.module';
import { TotpModule } from './totp/totp.module';
import { AuditLogModule } from './audit-log/audit-log.module';

@Module({
  imports: [
    // Load environment variables globally
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    UsersModule,
    AuthModule,
    AdminModule,
    StoresModule,
    SchedulingModule,
    ChangeRequestsModule,
    LaborRulesModule,
    TimeSummaryModule,
    DocumentsModule,
    NotificationsModule,
    UploadsModule,
    TimeEntriesModule,
    TotpModule,
    AuditLogModule,
  ],
})
export class AppModule {}
