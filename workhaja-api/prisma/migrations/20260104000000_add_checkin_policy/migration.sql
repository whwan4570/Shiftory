-- AlterTable
ALTER TABLE "stores" ADD COLUMN "checkin_primary_method" TEXT NOT NULL DEFAULT 'GPS',
ADD COLUMN "checkin_allow_fallback" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "checkin_gps_radius" DOUBLE PRECISION NOT NULL DEFAULT 4828.032,
ADD COLUMN "checkin_require_both" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "checkin_window_start_mins" INTEGER NOT NULL DEFAULT -30,
ADD COLUMN "checkin_window_end_mins" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN "checkout_window_start_mins" INTEGER NOT NULL DEFAULT -10,
ADD COLUMN "checkout_window_end_mins" INTEGER NOT NULL DEFAULT 180,
ADD COLUMN "checkin_no_shift_behavior" TEXT NOT NULL DEFAULT 'ALLOW_FLAG',
ADD COLUMN "checkin_offline_behavior" TEXT NOT NULL DEFAULT 'ALLOW_REQUEST';

