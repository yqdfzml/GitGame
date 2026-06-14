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
