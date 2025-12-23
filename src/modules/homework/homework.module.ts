import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Homework } from './entities/homework.entity';
import { TeacherProfile } from '../teachers/entities/teacher-profile.entity';
import { StudentProfile } from '../students/entities/student-profile.entity';

import { HomeworkService } from './homework.service';
import { HomeworkController } from './homework.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Homework, TeacherProfile, StudentProfile])],
  controllers: [HomeworkController],
  providers: [HomeworkService],
  exports: [HomeworkService],
})
export class HomeworkModule {}
