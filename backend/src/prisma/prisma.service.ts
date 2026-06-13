import { Injectable, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

/**
 * Prisma 数据库服务。
 * 功能：提供全局 Prisma 客户端并在模块初始化时连接数据库。
 * 参数：无（通过 NestJS 依赖注入使用）。
 * 返回值：PrismaClient 实例方法。
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  /**
   * 模块初始化时连接数据库。
   * 功能：启动阶段建立 Prisma 连接。
   * 参数：无。
   * 返回值：Promise<void>。
   */
  async onModuleInit() {
    await this.$connect();
  }
}
