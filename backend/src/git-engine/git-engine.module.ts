import { Module } from "@nestjs/common";
import { GitEngineService } from "./git-engine.service";

/** Git 虚拟状态机模块，供 Attempts 模块调用 */
@Module({
  providers: [GitEngineService],
  exports: [GitEngineService],
})
export class GitEngineModule {}
