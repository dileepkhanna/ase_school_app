import { PartialType } from '@nestjs/swagger';
import { CreateStudentDto } from './create-student.dto';

/**
 * Update student profile fields.
 * (Password updates must go through Auth/Reset flow, not here.)
 */
export class UpdateStudentDto extends PartialType(CreateStudentDto) {}
