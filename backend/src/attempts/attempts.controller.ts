import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Body,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthRequest, JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AttemptsService } from "./attempts.service";
import { SubmitCommandDto } from "./dto/submit-command.dto";
import { ResolveConflictDto } from "./dto/resolve-conflict.dto";

/** 练习会话控制器 */
@Controller()
export class AttemptsController {
  constructor(private readonly attemptsService: AttemptsService) {}

  /**
   * 创建新的练习会话。
   * 功能：根据关卡 initialState 初始化虚拟仓库。
   * 参数：levelId - 关卡 id；req - 鉴权请求。
   * 返回值：attempt 详情（新建或恢复）。
   */
  @Post("levels/:levelId/attempts")
  @UseGuards(JwtAuthGuard)
  createAttempt(@Param("levelId", ParseIntPipe) levelId: number, @Req() req: AuthRequest) {
    const userId = BigInt(req.user!.sub);
    return this.attemptsService.createAttempt(userId, BigInt(levelId));
  }

  /**
   * 获取练习会话详情。
   * 功能：返回当前状态、命令历史和判题差距。
   * 参数：id - attempt id；req - 鉴权请求。
   * 返回值：attempt 详情。
   */
  @Get("attempts/:id")
  @UseGuards(JwtAuthGuard)
  getAttempt(@Param("id", ParseIntPipe) id: number, @Req() req: AuthRequest) {
    const userId = BigInt(req.user!.sub);
    return this.attemptsService.getAttempt(userId, BigInt(id));
  }

  /**
   * 提交 Git 命令。
   * 功能：执行虚拟 Git 命令、判题、保存快照。
   * 参数：id - attempt id；dto - 命令；req - 鉴权请求。
   * 返回值：命令执行结果和判题反馈。
   */
  @Post("attempts/:id/commands")
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  submitCommand(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: SubmitCommandDto,
    @Req() req: AuthRequest,
  ) {
    const userId = BigInt(req.user!.sub);
    return this.attemptsService.submitCommand(userId, BigInt(id), dto.command);
  }

  /**
   * 保存手动解决后的冲突文件。
   * 功能：接收 Vim 或可视化编辑器提交的内容，更新仓库状态。
   * 参数：id - attempt id；dto - 文件路径与内容；req - 鉴权请求。
   * 返回值：更新后的状态与判题反馈。
   */
  @Post("attempts/:id/resolve-conflict")
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  resolveConflict(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: ResolveConflictDto,
    @Req() req: AuthRequest,
  ) {
    const userId = BigInt(req.user!.sub);
    return this.attemptsService.resolveConflict(userId, BigInt(id), dto.path, dto.content);
  }

  /**
   * 清空练习已执行步骤。
   * 功能：将仓库与命令历史恢复到开局状态。
   * 参数：id - attempt id；req - 鉴权请求。
   * 返回值：重置后的 attempt 详情。
   */
  @Post("attempts/:id/reset-steps")
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  resetAttemptSteps(@Param("id", ParseIntPipe) id: number, @Req() req: AuthRequest) {
    const userId = BigInt(req.user!.sub);
    return this.attemptsService.resetAttemptSteps(userId, BigInt(id));
  }

  /**
   * 获取练习复盘数据。
   * 功能：返回完整命令历史和状态快照序列。
   * 参数：id - attempt id；req - 鉴权请求。
   * 返回值：replay 数据。
   */
  @Get("attempts/:id/replay")
  @UseGuards(JwtAuthGuard)
  getReplay(@Param("id", ParseIntPipe) id: number, @Req() req: AuthRequest) {
    const userId = BigInt(req.user!.sub);
    return this.attemptsService.getReplay(userId, BigInt(id));
  }
}
