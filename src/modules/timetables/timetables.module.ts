import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from '../users/entities/user.entity';
import { TeacherProfile } from '../teachers/entities/teacher-profile.entity';
import { StudentProfile } from '../students/entities/student-profile.entity';

import { TeacherTimetable } from './entities/teacher-timetable.entity';
import { TeacherTimetableSlot } from './entities/teacher-timetable-slot.entity';
import { StudentTimetable } from './entities/student-timetable.entity';
import { StudentTimetableSlot } from './entities/student-timetable-slot.entity';

import { TimetablesService } from './timetables.service';
import { TimetablesController } from './timetables.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      TeacherProfile,
      StudentProfile,
      TeacherTimetable,
      TeacherTimetableSlot,
      StudentTimetable,
      StudentTimetableSlot,
    ]),
  ],
  controllers: [TimetablesController],
  providers: [TimetablesService],
  exports: [TimetablesService],
})
export class TimetablesModule {}
