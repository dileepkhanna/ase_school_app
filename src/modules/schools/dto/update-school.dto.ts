import { PartialType } from '@nestjs/swagger';
import { CreateSchoolDto } from './create-school.dto';

/**
 * Update school details (name/logo/isActive).
 * (Geofence has its own DTO for clarity + security)
 */
export class UpdateSchoolDto extends PartialType(CreateSchoolDto) {}
