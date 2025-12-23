import { Transform } from 'class-transformer';
import { IsInt, IsNotEmpty, Max, Min } from 'class-validator';

export class UpdateGeofenceDto {
  @Transform(({ value }) => Number(value))
  @IsNotEmpty()
  @Max(90)
  @Min(-90)
  geofenceLat!: number;

  @Transform(({ value }) => Number(value))
  @IsNotEmpty()
  @Max(180)
  @Min(-180)
  geofenceLng!: number;

  @Transform(({ value }) => Number(value))
  @IsNotEmpty()
  @IsInt()
  @Min(50)
  @Max(2000)
  geofenceRadiusM!: number;
}
