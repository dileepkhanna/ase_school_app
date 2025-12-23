import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { StudentAttendance } from './entities/student-attendance.entity';
import { TeacherAttendance } from './entities/teacher-attendance.entity';

import { TeacherProfile } from '../teachers/entities/teacher-profile.entity';
import { StudentProfile } from '../students/entities/student-profile.entity';

import { NotificationsModule } from '../notifications/notifications.module';

import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([StudentAttendance, TeacherAttendance, TeacherProfile, StudentProfile]),
    NotificationsModule,
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
