import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RedisModule } from '../integrations/redis/redis.module';

import { NotificationsModule } from '../modules/notifications/notifications.module';

import { School } from '../modules/schools/entities/school.entity';
import { User } from '../modules/users/entities/user.entity';
import { TeacherProfile } from '../modules/teachers/entities/teacher-profile.entity';
import { StudentProfile } from '../modules/students/entities/student-profile.entity';

import { Exam } from '../modules/exams/entities/exam.entity';
import { ExamSchedule } from '../modules/exams/entities/exam-schedule.entity';

import { Recap } from '../modules/recaps/entities/recap.entity';
import { Homework } from '../modules/homework/entities/homework.entity';
import { TeacherAttendance } from '../modules/attendance/entities/teacher-attendance.entity';

import { TeacherBirthdayJob } from './teacher-birthday.job';
import { StudentBirthdayJob } from './student-birthday.job';
import { ExamReminderJob } from './exam-reminder.job';
import { AttendanceRollupJob } from './attendance-rollup.job';

@Module({
  imports: [
    // If ScheduleModule.forRoot() is already in AppModule, you can remove this
    ScheduleModule.forRoot(),

    RedisModule,
    NotificationsModule,

    TypeOrmModule.forFeature([
      School,
      User,
      TeacherProfile,
      StudentProfile,
      Exam,
      ExamSchedule,
      Recap,
      Homework,
      TeacherAttendance,
    ]),
  ],
  providers: [TeacherBirthdayJob, StudentBirthdayJob, ExamReminderJob, AttendanceRollupJob],
})
export class JobsModule {}
