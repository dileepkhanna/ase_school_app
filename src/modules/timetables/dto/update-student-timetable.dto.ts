import { PartialType } from '@nestjs/swagger';
import { CreateStudentTimetableDto } from './create-student-timetable.dto';

/**
 * Update = replace slots for class/section timetable.
 */
export class UpdateStudentTimetableDto extends PartialType(CreateStudentTimetableDto) {}
