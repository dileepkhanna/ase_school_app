import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class EnterMarksRowDto {
  @Transform(({ value }) => String(value ?? '').trim())
  @IsUUID()
  studentProfileId!: string;

  @Transform(({ value }) => Number(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(10000)
  marksObtained!: number;

  @Transform(({ value }) => Number(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(10000)
  maxMarks!: number;
}

export class EnterMarksDto {
  @Transform(({ value }) => String(value ?? '').trim())
  @IsUUID()
  examId!: string;

  @Transform(({ value }) => String(value ?? '').trim())
  @IsUUID()
  scheduleId!: string;

  /**
   * Optional note (teacher)
   */
  @IsOptional()
  @Transform(({ value }) => (value ? String(value).trim() : undefined))
  @IsString()
  @MaxLength(200)
  note?: string;

  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => EnterMarksRowDto)
  rows!: EnterMarksRowDto[];
}
