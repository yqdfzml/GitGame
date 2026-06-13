import { Prisma } from "@prisma/client";

/**
 * 将业务对象转为 Prisma 可写入的 JSON 值。
 * 功能：通过序列化去掉 TS 接口与 InputJsonValue 的结构差异。
 * 参数：value - 任意可 JSON 序列化的对象。
 * 返回值：Prisma InputJsonValue。
 */
export const toPrismaJson = (value: unknown): Prisma.InputJsonValue => {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
};

/**
 * 从 Prisma JSON 字段解析为业务类型。
 * 功能：读取 Json 字段时使用，避免直接与 RepoState 断言冲突。
 * 参数：value - 数据库读出的 JSON 值。
 * 返回值：目标类型 T。
 */
export const fromPrismaJson = <T>(value: unknown): T => {
  return value as unknown as T;
};
