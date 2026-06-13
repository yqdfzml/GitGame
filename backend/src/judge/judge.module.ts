import { Module } from "@nestjs/common";
import { JudgeService } from "./judge.service";

/** 判题模块，供 Attempts 模块调用 */
@Module({
  providers: [JudgeService],
  exports: [JudgeService],
})
export class JudgeModule {}
