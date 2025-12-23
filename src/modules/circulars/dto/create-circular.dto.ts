// import { Transform } from 'class-transformer';
// import {
//   ArrayMaxSize,
//   IsArray,
//   IsEnum,
//   IsNotEmpty,
//   IsOptional,
//   IsString,
//   MaxLength,
// } from 'class-validator';
// import { CircularType } from '../../../common/enums/circular-type.enum';

// export class CreateCircularDto {
//   @Transform(({ value }) => String(value ?? '').trim().toUpperCase())
//   @IsEnum(CircularType)
//   type!: CircularType;

//   @Transform(({ value }) => String(value ?? '').trim())
//   @IsString()
//   @IsNotEmpty()
//   @MaxLength(200)
//   title!: string;

//   @Transform(({ value }) => String(value ?? '').trim())
//   @IsString()
//   @IsNotEmpty()
//   description!: string;

//   /**
//    * Cloudflare R2 URLs (already uploaded by client)
//    */
//   @IsOptional()
//   @IsArray()
//   @ArrayMaxSize(10)
//   @Transform(({ value }) => (Array.isArray(value) ? value.map((x) => String(x).trim()).filter(Boolean) : undefined))
//   images?: string[];
// }







import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { CircularType } from '../../../common/enums/circular-type.enum';

export class CreateCircularDto {
  @Transform(({ value }) => String(value ?? '').trim().toUpperCase())
  @IsEnum(CircularType)
  type!: CircularType;

  @Transform(({ value }) => String(value ?? '').trim())
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @Transform(({ value }) => String(value ?? '').trim())
  @IsString()
  @IsNotEmpty()
  description!: string;

  /**
   * ✅ Old field: images
   */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @Transform(({ value }) =>
    Array.isArray(value) ? value.map((x) => String(x).trim()).filter(Boolean) : undefined,
  )
  images?: string[];

  /**
   * ✅ New/alternate field: imageUrls (Swagger people usually send this)
   * We accept it too, and service will merge/prefer it.
   */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @Transform(({ value }) =>
    Array.isArray(value) ? value.map((x) => String(x).trim()).filter(Boolean) : undefined,
  )
  imageUrls?: string[];

  /**
   * ✅ Optional publishDate (ISO string)
   * Example: "2025-12-19T10:00:00.000Z"
   */
  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === null ? undefined : String(value).trim()))
  @IsString()
  @MaxLength(40)
  publishDate?: string;
}
