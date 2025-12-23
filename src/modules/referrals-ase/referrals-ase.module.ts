import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AseReferral } from './entities/ase-referral.entity';
import { AseReferralAudit } from './entities/ase-referral-audit.entity';

import { NotificationsModule } from '../notifications/notifications.module';

import { ReferralsAseService } from './referrals-ase.service';
import { ReferralsAseController } from './referrals-ase.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([AseReferral, AseReferralAudit]),
    NotificationsModule,
  ],
  controllers: [ReferralsAseController],
  providers: [ReferralsAseService],
  exports: [ReferralsAseService],
})
export class ReferralsAseModule {}
