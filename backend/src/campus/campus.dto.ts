import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsEnum,
  IsIn,
  IsInt,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
  ValidateIf,
} from "class-validator";
import { Category, ReportStatus } from "../generated/prisma/enums.js";
const trim = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value);
const optional = (_: unknown, value: unknown) => value !== undefined;
export class ReportInput {
  @ApiProperty({ example: "Water fountain leaking" })
  @IsString()
  @Length(3, 120)
  @Transform(trim)
  @Matches(/\S/)
  title!: string;
  @ApiProperty() @IsString() @Length(10, 4000) @Transform(trim) @Matches(/\S/) description!: string;
  @ApiProperty({ enum: Category }) @IsEnum(Category) category!: Category;
  @ApiProperty() @IsString() @Length(1, 64) locationId!: string;
  @ApiProperty() @IsString() @Length(3, 300) @Transform(trim) @Matches(/\S/) exactLocation!: string;
  @ApiProperty({ format: "uuid" }) @IsUUID("4") attachmentId!: string;
}
export class EditReportInput {
  @ApiProperty() @IsString() @Length(3, 120) @Transform(trim) @Matches(/\S/) title!: string;
  @ApiProperty() @IsString() @Length(10, 4000) @Transform(trim) @Matches(/\S/) description!: string;
  @ApiProperty() @IsString() @Length(3, 300) @Transform(trim) @Matches(/\S/) exactLocation!: string;
}
export class ReportsQuery {
  @ApiPropertyOptional() @ValidateIf(optional) @IsString() @Length(1, 120) q?: string;
  @ApiPropertyOptional({ enum: Category })
  @ValidateIf(optional)
  @IsEnum(Category)
  category?: Category;
  @ApiPropertyOptional({ enum: ReportStatus })
  @ValidateIf(optional)
  @IsEnum(ReportStatus)
  status?: ReportStatus;
  @ApiPropertyOptional() @ValidateIf(optional) @IsString() @Length(1, 64) locationId?: string;
  @ApiPropertyOptional() @ValidateIf(optional) @IsIn(["mine", "confirmed"]) activity?:
    "mine" | "confirmed";
  @ApiPropertyOptional() @IsIn(["newest", "confirmed"]) sort: "newest" | "confirmed" = "newest";
  @ApiPropertyOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value,
  )
  @IsInt()
  @Min(1)
  @Max(10000)
  page = 1;
  @ApiPropertyOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value,
  )
  @IsInt()
  @Min(1)
  @Max(60)
  limit = 12;
}
export class SimilarInput {
  @IsString() @Length(3, 120) title!: string;
  @IsString() @Length(0, 4000) description!: string;
  @IsEnum(Category) category!: Category;
  @IsString() @Length(1, 64) locationId!: string;
}
export class LoginInput {
  @IsString() @Length(1, 80) username!: string;
  @IsString() @Length(12, 128) password!: string;
}
export class StatusInput {
  @IsEnum(ReportStatus) status!: ReportStatus;
  @IsString() @Length(3, 500) @Transform(trim) @Matches(/\S/) note!: string;
}
