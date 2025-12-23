import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Admission } from './entities/admission.entity';
import { TeacherProfile } from '../teachers/entities/teacher-profile.entity';

import { ReferralsStudentsModule } from '../referrals-students/referrals-students.module';
import { NotificationsModule } from '../notifications/notifications.module';

import { AdmissionsService } from './admissions.service';
import { AdmissionsController } from './admissions.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Admission, TeacherProfile]),
    ReferralsStudentsModule,
    NotificationsModule,
  ],
  controllers: [AdmissionsController],
  providers: [AdmissionsService],
  exports: [AdmissionsService],
})
export class AdmissionsModule {}
