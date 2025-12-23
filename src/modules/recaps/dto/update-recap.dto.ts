import { PartialType } from '@nestjs/swagger';
import { CreateRecapDto } from './create-recap.dto';

export class UpdateRecapDto extends PartialType(CreateRecapDto) {}
