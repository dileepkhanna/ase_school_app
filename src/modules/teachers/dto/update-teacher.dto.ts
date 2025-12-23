import { PartialType } from '@nestjs/swagger';
import { CreateTeacherDto } from './create-teacher.dto';

/**
 * Update teacher profile fields.
 * (Password updates are handled via Auth/Users flows, not here.)
 */
export class UpdateTeacherDto extends PartialType(CreateTeacherDto) {}
