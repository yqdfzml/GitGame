import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { PUBLIC_LIST_LIMIT_MAX } from "../../common/dto/pagination-query.dto";

/**
 * 排行榜查询参数。
 * 功能：校验 limit 与可选 levelId。
 */
export class LeaderboardQueryDto {
  /** 单关排行榜时的关卡 id */
  @IsOptional()
  @IsString()
  levelId?: string;

  /** 返回条数，默认 20 */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PUBLIC_LIST_LIMIT_MAX)
  limit?: number = 20;
}
