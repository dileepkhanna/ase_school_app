import { PartialType } from '@nestjs/swagger';
import { CreateTeacherTimetableDto } from './create-teacher-timetable.dto';

/**
 * Update = replace slots for teacher timetable
 * We keep it simple: principal edits then Save -> full replace.
 */
export class UpdateTeacherTimetableDto extends PartialType(CreateTeacherTimetableDto) {}
