import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";

/** 公开列表 limit 上限 */
export const PUBLIC_LIST_LIMIT_MAX = 100;

/**
 * 解析公开列表 limit 查询参数。
 * 功能：限制排行榜、首页动态等接口的 take 范围。
 */
export class PublicLimitQueryDto {
  /** 返回条数，默认 20，最大 100 */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PUBLIC_LIST_LIMIT_MAX)
  limit?: number = 20;
}
