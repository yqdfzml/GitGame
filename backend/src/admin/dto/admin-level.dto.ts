import {
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
import { Difficulty } from "@prisma/client";

/** 创建关卡 DTO */
export class CreateLevelDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  courseId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  chapterId?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  title!: string;

  @IsString()
  @MinLength(1)
  description!: string;

  @IsEnum(Difficulty)
  difficulty!: Difficulty;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsObject()
  initialState!: Record<string, unknown>;

  @IsObject()
  goal!: Record<string, unknown>;

  @IsObject()
  constraints!: Record<string, unknown>;
}

/** 关卡排序调整 DTO */
export class SortLevelDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  courseId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  chapterId?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

/** 更新关卡 DTO */
export class UpdateLevelDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(Difficulty)
  difficulty?: Difficulty;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsObject()
  initialState?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  goal?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  constraints?: Record<string, unknown>;
}
