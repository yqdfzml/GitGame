import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";
import { PUBLIC_LIST_LIMIT_MAX } from "../../common/dto/pagination-query.dto";

/**
 * 首页概览查询参数。
 * 功能：限制排行榜与动态条数，防止异常 take 值。
 */
export class HomeOverviewQueryDto {
  /** 排行榜条数，默认 10 */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PUBLIC_LIST_LIMIT_MAX)
  leaderboardLimit?: number = 10;

  /** 动态条数，默认 20 */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PUBLIC_LIST_LIMIT_MAX)
  activityLimit?: number = 20;
}
