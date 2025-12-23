import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { StudentReferral } from './entities/student-referral.entity';

import { ReferralsStudentsService } from './referrals-students.service';
import { ReferralsStudentsController } from './referrals-students.controller';

@Module({
  imports: [TypeOrmModule.forFeature([StudentReferral])],
  controllers: [ReferralsStudentsController],
  providers: [ReferralsStudentsService],
  exports: [ReferralsStudentsService],
})
export class ReferralsStudentsModule {}
