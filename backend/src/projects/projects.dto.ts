import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsInt, IsString, Length, Matches, Max, MaxLength, Min, ValidateIf } from "class-validator";

export class CreateProjectDto {
  @ApiProperty({ example: "Library repairs", minLength: 1, maxLength: 120 })
  @IsString()
  @Length(1, 120)
  @Matches(/\S/)
  name!: string;

  @ApiProperty({ example: "library-repairs", pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$", maxLength: 80 })
  @IsString()
  @Length(1, 80)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug!: string;

  @ApiPropertyOptional({ example: "Track maintenance in the library", maxLength: 2000 })
  @ValidateIf((_o, v: unknown) => v !== undefined)
  @IsString()
  @MaxLength(2000)
  description?: string;
}

// Do not use IsOptional: null must not bypass validation for non-nullable fields.
export class UpdateProjectDto {
  @ApiPropertyOptional({ example: "Library maintenance", maxLength: 120 })
  @ValidateIf((_o, v: unknown) => v !== undefined)
  @IsString()
  @Length(1, 120)
  @Matches(/\S/)
  name?: string;

  @ApiPropertyOptional({ example: "library-maintenance", maxLength: 80 })
  @ValidateIf((_o, v: unknown) => v !== undefined)
  @IsString()
  @Length(1, 80)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug?: string;

  @ApiPropertyOptional({ example: "Updated description", maxLength: 2000 })
  @ValidateIf((_o, v: unknown) => v !== undefined)
  @IsString()
  @MaxLength(2000)
  description?: string;
}

export class PageDto {
  @ApiPropertyOptional({ default: 1, minimum: 1, maximum: 10000 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value,
  )
  @IsInt()
  @Min(1)
  @Max(10000)
  page = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value,
  )
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}

export class ProjectResponse {
  @ApiProperty({ format: "uuid" }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() slug!: string;
  @ApiProperty({ type: String, nullable: true }) description!: string | null;
  @ApiProperty({ type: String, format: "date-time" }) createdAt!: Date;
  @ApiProperty({ type: String, format: "date-time" }) updatedAt!: Date;
}
export class ProjectPageResponse {
  @ApiProperty({ type: [ProjectResponse] }) data!: ProjectResponse[];
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
}
