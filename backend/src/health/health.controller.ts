import { Controller, Get } from "@nestjs/common";

/** 健康检查控制器 */
@Controller()
export class HealthController {
  /**
   * 存活探针。
   * 功能：Docker/K8s 健康检查。
   * 参数：无。
   * 返回值：ok 状态。
   */
  @Get("healthz")
  healthz() {
    return { status: "ok" };
  }
}
