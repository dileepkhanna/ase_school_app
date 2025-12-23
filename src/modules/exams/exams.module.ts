import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Exam } from './entities/exam.entity';
import { ExamSchedule } from './entities/exam-schedule.entity';
import { ExamMarks } from './entities/exam-marks.entity';
import { ExamResult } from './entities/exam-result.entity';

import { TeacherProfile } from '../teachers/entities/teacher-profile.entity';
import { TeacherSubject } from '../teachers/entities/teacher-subject.entity';
import { StudentProfile } from '../students/entities/student-profile.entity';

import { NotificationsModule } from '../notifications/notifications.module';

import { ExamsService } from './exams.service';
import { ExamsController } from './exams.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Exam,
      ExamSchedule,
      ExamMarks,
      ExamResult,
      TeacherProfile,
      TeacherSubject,
      StudentProfile,
    ]),
    NotificationsModule,
  ],
  controllers: [ExamsController],
  providers: [ExamsService],
  exports: [ExamsService],
})
export class ExamsModule {}
